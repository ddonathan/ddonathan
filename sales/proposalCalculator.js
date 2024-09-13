//
//  ███████╗██╗   ██╗███╗   ██╗ ██████╗████████╗██╗ ██████╗ ███╗   ██╗███████╗
//  ██╔════╝██║   ██║████╗  ██║██╔════╝╚══██╔══╝██║██╔═══██╗████╗  ██║██╔════╝
//  █████╗  ██║   ██║██╔██╗ ██║██║        ██║   ██║██║   ██║██╔██╗ ██║███████╗
//  ██╔══╝  ██║   ██║██║╚██╗██║██║        ██║   ██║██║   ██║██║╚██╗██║╚════██║
//  ██║     ╚██████╔╝██║ ╚████║╚██████╗   ██║   ██║╚██████╔╝██║ ╚████║███████║
//  ╚═╝      ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝
//

// Set options based on Package
function setPackageItems() {
  let package = document.getElementById("package").value;
  let market = document.getElementById("market").value;
  let userCount = document.getElementById("userCount").value;

  // Set selections based on Package and Market
  switch (true) {
    case package == "smbGrowth" && market === "NOAM":
      document.getElementById("ats").value = "ats_enterprise";
      document.getElementById("time_expense").checked = true;
      document.getElementById("invoicing").checked = true;
      document.getElementById("analytics").value = "analyticsGrowth";
      document.getElementById("automation").value = "autoEss";
      document.getElementById("onboarding").value = "onbClassic";
      break;
    case package == "smbGrowth" && market !== "NOAM":
      document.getElementById("ats").value = "analyticsGrowth";
      document.getElementById("time_expense").checked = false;
      document.getElementById("invoicing").checked = false;
      document.getElementById("analytics").value = "analyticsGrowth";
      document.getElementById("automation").value = "autoEss";
      document.getElementById("onboarding").value = "onbClassic";
      break;
    case package == "fieldGrowth" && market === "NOAM":
      document.getElementById("ats").value = "ats_enterprise";
      document.getElementById("time_expense").checked = true;
      document.getElementById("invoicing").checked = true;
      document.getElementById("analytics").value = "";

      // Depending on user count, set essentials or intermediate
      if (userCount < 25) {
        document.getElementById("automation").value = "autoEss";
      } else {
        document.getElementById("automation").value = "autoInt";
      }
      break;
    case package == "fieldGrowth" && market !== "NOAM":
      document.getElementById("ats").value = "ats_enterprise";
      document.getElementById("time_expense").checked = false;
      document.getElementById("invoicing").checked = false;
      document.getElementById("analytics").value = "";

      // Depending on user count, set essentials or intermediate
      if (userCount < 25) {
        document.getElementById("automation").value = "autoEss";
      } else {
        document.getElementById("automation").value = "autoInt";
      }
      document.getElementById("onboarding").value = "onb365";
      break;
    default:
      document.getElementById("ats").checked = false;
      document.getElementById("time_expense").checked = false;
      document.getElementById("invoicing").checked = false;
      document.getElementById("analytics").value = "";
      document.getElementById("automation").value = "";
      document.getElementById("onboarding").value = "";
      break;
  }
}

function generate() {
  loadFile("template2.docx", function (error, content) {
    if (error) {
      throw error;
    }

    // The error object contains additional information when logged with JSON.stringify (it contains a properties object containing all suberrors).
    function replaceErrors(key, value) {
      if (value instanceof Error) {
        return Object.getOwnPropertyNames(value).reduce(function (error, key) {
          error[key] = value[key];
          return error;
        }, {});
      }
      return value;
    }

    function errorHandler(error) {
      console.error(JSON.stringify({ error: error }, replaceErrors));

      if (error.properties && error.properties.errors instanceof Array) {
        const errorMessages = error.properties.errors
          .map(function (error) {
            return error.properties.explanation;
          })
          .join("\n");
        console.error("errorMessages", errorMessages);
        // errorMessages is a humanly readable message looking like this :
        // 'The tag beginning with "foobar" is unopened'
      }
      throw error;
    }

    var zip = new PizZip(content);
    var doc;
    try {
      doc = new window.docxtemplater(zip, { paragraphLoop: true });
    } catch (error) {
      // Catch compilation errors (errors caused by the compilation of the template : misplaced tags)
      errorHandler(error);
    }

    // Retrieve the data from sessionStorage
    const pricingData = JSON.parse(sessionStorage.getItem("pricingData"));
    const dataToSend = pricingData.data;

    // Get Currency
    const currency = pricingData.data.currency;
    const rate = pricingData.calcs.rates[currency] || 1;

    // Copy down relevant data to dataToSend
    // Set timelineLow and timelineHigh
    dataToSend[`timeline${pricingData.data.timelineTable}`] = true;
    dataToSend.timelineWeeks = `${dataToSend.timelineLow} - ${dataToSend.timelineHigh} weeks`;

    // Get the fields where data-noPriceRefresh and add them to dataToSend
    const noPriceRefresh = document.querySelectorAll("[data-noPriceRefresh]");
    noPriceRefresh.forEach((field) => {
      // If the field is a checkbox, add the checked value
      if (field.type === "checkbox") {
        dataToSend[field.id] = field.checked;
      } else {
        dataToSend[field.id] = field.value;
      }

      // if the field is an input and has data in it, add it
      if (field.type === "text" && field.value !== "") {
        dataToSend[field.id] = field.value;
      }
    });

    // Sort pricingData.calcs.itemized by type in Z-A order so that bundles will be processed last and can remove product items.
    pricingData.calcs.itemized.sort((a, b) => {
      if (a.type < b.type) {
        return 1;
      }
      if (a.type > b.type) {
        return -1;
      }
      return 0;
    });

    // Loop through pricingData.calcs.itemized and push to dataToSend.products
    dataToSend.products = [];
    pricingData.calcs.itemized.forEach((item) => {
      if (item.type === "product" || item.type === "bundle") {
        let name = item.name;

        // Add items ids to the data object to enable additional items to show in the contract
        switch (item.id) {
          case "ats_essentials":
          case "ats_premium":
          case "autoEss":
          case "autoInt":
          case "autoAdv":
          case "autoTra":
          case "talentPlatformFdn":
          case "talentPlatformFndHc":
            dataToSend[item.id] = true;
            break;

            // Find and remove the bundled items from dataToSend
            delete dataToSend.autoEss;

            break;
          case "talentPlatformInt":
            dataToSend.talentPlatform = true;
            dataToSend[item.id] = true;

            // Find and remove the bundled items from dataToSend
            delete dataToSend.autoInt;

            break;
        }

        if (dataToSend.ats) {
          dataToSend[dataToSend.ats] = true;
        }

        // if there's a quantity, add to name
        if (item.quantity) {
          name = `${name} (${item.quantity})`;
        }

        dataToSend.products.push(name);
      }
    });

    // Determine if Time/Expense is an item in the products array
    if (dataToSend.products.includes("Time/Expense") || dataToSend.products.includes("Time/Expense")) {
      dataToSend.isBBO = true;
    }

    // If we have any paidAdditions, set paidAdditions to true
    if (
      dataToSend.commissions ||
      dataToSend.credentialing ||
      dataToSend.newHireExport ||
      dataToSend.qbIntegration ||
      dataToSend.InvoiceExport ||
      dataToSend.PayDataExport ||
      dataToSend.emailsAsNotes ||
      dataToSend.histSubmissions ||
      dataToSend.npeCount ||
      dataToSend.oscpCount
    ) {
      dataToSend.paidAdditions = true;
    } else {
      dataToSend.paidAdditions = false;
    }

    // Get any data we need that's in the form that didn't go to AWS and back
    if (document.getElementById("bullhornSubsidy").checked) {
      dataToSend.bullhornSubsidy = true;
    } else {
      dataToSend.bullhornSubsidy = false;
    }

    // Format dollar amounts if we have them
    dataToSend.onSiteTrainingAmt = formatCurrency(
      dataToSend.onSiteTrainingAmt,
      currency,
      rate,
    );
    dataToSend.afterCareAmt = formatCurrency(
      dataToSend.afterCareAmt,
      currency,
      rate,
    );

    // If there's a price override, use that, otherwise use totalAmt
    if (pricingData.data.overridePriceAmt) {
      console.info("Using override amount");
      dataToSend.totalAmt = formatCurrency(
        pricingData.data.overridePriceAmt,
        currency,
        rate,
      );
    } else {
      dataToSend.totalAmt = formatCurrency(
        pricingData.calcs.total.low,
        currency,
        rate,
      );
    }

    // If needed to convert number to word
    var dg = [
      "zero",
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
      "nine",
    ];

    // Convert numbers to words
    dataToSend.plCount = dg[dataToSend.plCount];
    dataToSend.npeCount = dg[dataToSend.npeCount];
    dataToSend.oscpCount = dg[dataToSend.oscpCount];

    // Convert numPayments
    let paymentNumber = dg[dataToSend.numPayments];
    dataToSend[`payments_${paymentNumber}`] = true;

    dataToSend.ganttChart = localStorage.getItem("gantt_chart");

    // Send to document creation
    doc.setData(dataToSend);
    try {
      // Determine the image size. We have a set width we want to use, but the image can be different heights, so we need to use that to determine the final size.
      dataToSend.width = 650;

      let img = new Image();
      img.onload = function () {
        let aspectRatio = this.width / this.height;
        dataToSend.height = dataToSend.width / aspectRatio;
      };

      img.src = dataToSend.ganttChart;

      // To use the image module, you have to be using docxtemplater async
      const imageOptions = {
        centered: false,
        getImage(url) {
          return new Promise(function (resolve, reject) {
            PizZipUtils.getBinaryContent(url, function (error, content) {
              if (error) {
                return reject(error);
              }
              return resolve(content);
            });
          });
        },
        getSize(img, url, tagName) {
          return new Promise(function (resolve, reject) {
            const image = new Image();
            image.src = url;
            image.onload = function () {
              resolve([dataToSend.width, dataToSend.height]);
            };
            image.onerror = function (e) {
              console.log("img, url, tagName : ", img, url, tagName);
              alert("An error occurred while loading " + url);
              reject(e);
            };
          });
        },
      };
      const docxType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      PizZipUtils.getBinaryContent("template2.docx", function (error, content) {
        if (error) {
          console.error(error);
          return;
        }

        const zip = new PizZip(content);
        const doc = new docxtemplater(zip, {
          modules: [new ImageModule(imageOptions)],
        });

        doc.renderAsync(dataToSend).then(function () {
          const out = doc.getZip().generate({
            type: "blob",
            mimeType: docxType,
          });
          saveAs(
            out,
            `${dataToSend.clientName} - Tonic HQ Implementation.docx`,
          );
        });
      });

      // Log out the dataToSend
      delete dataToSend.ganttChart;
      delete dataToSend.width;
      // dataToSend = await removeBlankProperties(dataToSend);
      console.info("generate-dataToSend", dataToSend);

      // Add this to the jsonOutput textarea
      document.getElementById("jsonOutput").value = JSON.stringify(
        dataToSend,
        null,
        2,
      );
    } catch (error) {
      // Catch rendering errors (errors relating to the rendering of the template : angularParser throws an error)
      errorHandler(error);
    }
  });
}

//
// Check that a form is valid and show alerts
//
function checkValid() {
  let alertText = "";
  let validationErrors = [];
  let validationWarnings = [];

  if (!document.getElementById("clientName").value) {
    validationErrors.push(" - Company Name not provided");
  }

  // if (!document.getElementById("existingSystem").value) {
  //   validationWarnings.push("  - Existing System not provided")
  // }

  if (!document.getElementById("timelineTable").value) {
    validationErrors.push("  - Timeline table not selected");
  }

  if (
    document.getElementById("ats").value &&
    !document.getElementById("dataSources").value &&
    !document.getElementById("NoDataMigration").checked
  ) {
    validationErrors.push(
      `  - No Data Source(s), but "No Data Migration" isn't checked`,
    );
  }

  if (
    document.getElementById("userCount").value > 15 &&
    document.getElementById("timelineLow").value <= "13"
  ) {
    // validationWarnings.push(`  - User count is ${document.getElementById("userCount").value} and timeline low is ${document.getElementById("timelineLow").value} `)
  }

  // If we've gotten pricing back, use the amounts to validate things
  if (sessionStorage.getItem("pricingData") !== "undefined") {
    const pricingData = JSON.parse(sessionStorage.getItem("pricingData"));

    // Amount is zero
    if (
      !pricingData?.calcs?.total?.low ||
      pricingData?.calcs?.total?.low === 0
    ) {
      console.error("Price is zero");
      validationErrors.push(`  - Price is $0`);
    } else {
      // Find `  - Price is $0` in validationErrors and remove it
      validationErrors = validationErrors.filter((error) => {
        return error !== "  - Price is $0";
      });
    }

    // Higher amount and only two payments
    if (
      pricingData?.body?.calcs?.total?.low > 15000 &&
      document.getElementById("numPayments").value === "2"
    ) {
      validationWarnings.push(
        `  - Price is ${formatter.format(
          pricingData.body.calcs.total.low,
        )} and it's set to just two payments`,
      );
    }
  }

  //  if the form is valid remove the validationMsg_div and show the generateProposal button
  if (validationErrors.length === 0 && validationWarnings.length === 0) {
    document.getElementById("validationMsg_div").className = "d-none";
    document.getElementById("validationMsg").innerHTML = "";
    document.getElementById("generateProposal").className = "btn btn-primary";
  } else {
    // Otherwise, show alerts
    console.warn({ validationErrors });

    // Show the alert box
    document.getElementById("validationMsg_div").className = "";

    // If it's an error, show them
    if (validationErrors.length > 0) {
      alertText =
        "<strong>Alerts:</strong> <br>" +
        validationErrors.join("<br>") +
        "<br>";
    }

    // If it's a warning, show them
    if (validationWarnings.length > 0) {
      alertText +=
        "<strong>Warnings:</strong> <br>" + validationWarnings.join("<br>");
      document.getElementById("validationMsg").className =
        "alert alert-warning fade show";
    }

    // If it's an error, show them
    if (validationErrors.length > 0) {
      document.getElementById("validationMsg").className =
        "alert alert-danger fade show";
    }

    // Hide Generate Proposal
    document.getElementById("generateProposal").className =
      "btn btn-primary d-none";

    // Finish up alertText and set it
    // alertText += '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"  data-bs-toggle="tooltip" data-bs-placement="right" title="Closing this alert will allow you to generate the proposal" onclick="checkValidOverride();"></button>';
    document.getElementById("validationMsg").innerHTML = alertText;

    return validationErrors;
  }
}

function checkValidOverride() {
  // document.getElementById("generateProposal").className = "btn btn-primary";
}

// Remove Falsy Function
const removeFalsy = (obj) => {
  let newObj = {};
  Object.keys(obj).forEach((prop) => {
    if (obj[prop]) {
      newObj[prop] = obj[prop];
    }
  });
  return newObj;
};

// Round to the nearest 10, 100, 500, etc.
function roundTo(amount, roundTo) {
  amount = Math.ceil(amount / roundTo) * roundTo;
  return amount;
}

// Set options based on back office
var isFirstRun = true;
function funcBackOfficeOptions(backoffice) {
  // If ATS or not, show the ATS options or not
  if (document.getElementById("ats").value) {
    if (document.getElementById("ats").value === "ats_enterprise") {
      document.getElementById("credentialing_div").className =
        "form-check form-switch";
    }
    document.getElementById("newHireExport_div").className =
      "form-check form-switch";
    document.getElementById("npe_div").className = "row mb-3";
    document.getElementById("pl_div").className = "row mb-3";
    document.getElementById("oscp_div").className = "row mb-3";
    document.getElementById("otherOptions_div").className = "row mb-3";
  } else {
    if (document.getElementById("ats").value === "ats_enterprise") {
      document.getElementById("credentialing_div").className =
        "row mb-3 d-none";
    }
    document.getElementById("newHireExport_div").className = "row mb-3 d-none";
    document.getElementById("npe_div").className = "row mb-3 d-none";
    document.getElementById("pl_div").className = "row mb-3 d-none";
    document.getElementById("oscp_div").className = "row mb-3 d-none";
    document.getElementById("otherOptions_div").className = "row mb-3 d-none";
  }

  // If it's either Time/Expense or Invoicing, show the backoffice options. If it's neither, hide them and reset the labels
  if (
    document.getElementById("time_expense")?.checked ||
    document.getElementById("invoicing")?.checked
  ) {
    document.getElementById("backoffice_options_div").className = "row mb-3";
  } else {
    document.getElementById("backoffice_options_div").className =
      "row mb-3 d-none";
  }

  // If time_expense, show and check the commissions option
  if (document.getElementById("time_expense")?.checked) {
    // Check the commissions checkbox only on the first run
    if (isFirstRun === true) {
      document.getElementById("commissions").checked = true;

      // Update the variable to indicate that the code has already run
      isFirstRun = false;
    }
  } else {
    document.getElementById("commissions").checked = false;
  }

  // If time/expense then show pay data export is checked then hide invoicing as an option
  if (document.getElementById("time_expense").checked) {
    document.getElementById("PayDataExport_div").className =
      "form-check form-switch";
  } else {
    document.getElementById("PayDataExport").checked = false;
    document.getElementById("PayDataExport_div").className =
      "form-check form-switch d-none";
  }

  // If invoicing then show invoice export as an option
  if (document.getElementById("invoicing").checked) {
    document.getElementById("InvoiceExport_div").className =
      "form-check form-switch";

    // If QuickBooks is checked then hide invoice export as an option
    if (document.getElementById("qbIntegration").checked) {
      document.getElementById("InvoiceExport").checked = false;
      document.getElementById("InvoiceExport_div").className =
        "form-check form-switch d-none";
    }
  } else {
    document.getElementById("InvoiceExport").checked = false;
    document.getElementById("InvoiceExport_div").className =
      "form-check form-switch d-none";
  }

  // Before we wrap up, test all the checkboxes and show only what's appropriate
  // If pay/bill is checked we'll show both invoice and pay data export
  if (
    event.target.name === "pay_bill" &&
    document.getElementById("pay_bill").checked === true
  ) {
    // document.getElementById("backoffice_options_div").className = "row mb-3";
    // document.getElementById("InvoiceExport_div").className = "form-check form-switch";
    // document.getElementById("PayDataExport_div").className = "form-check form-switch";
  }

  if (
    event.target.name === "pay_bill" &&
    document.getElementById("pay_bill").checked === false
  ) {
    // Uncheck and hide the options
    // document.getElementById("PayDataExport_div").className = "form-check form-switch d-none";
    // document.getElementById("InvoiceExport_div").className = "form-check form-switch d-none";
    // document.getElementById("qbIntegration").checked = false;
    // document.getElementById("InvoiceExport").checked = false;
    // document.getElementById("PayDataExport").checked = false;

    // If applicable, enable the checkboxes
    if (document.getElementById("invoicing").checked)
      document.getElementById("InvoiceExport_div").className =
        "form-check form-switch";
    if (document.getElementById("time_expense").checked)
      document.getElementById("PayDataExport_div").className =
        "form-check form-switch";
  }
}

function funcOnSiteTraining() {
  if (document.getElementById("onSiteTraining").checked) {
    document.getElementById("onSiteTraining_div").className = "col-sm-2";
  } else {
    document.getElementById("onSiteTraining_div").className = "d-none";
  }
}

function funcAfterCare() {
  if (document.getElementById("afterCare").checked) {
    document.getElementById("afterCare_div").className = "col-sm-2";
  } else {
    document.getElementById("afterCare_div").className = "d-none";
  }
}

function funcTimelineTable() {
  switch (document.getElementById("timelineTable").value) {
    case "NoDM":
      document.getElementById("timelineLow").value = "9";
      document.getElementById("timelineHigh").value = "12";
      break;
    case "SMB":
      document.getElementById("timelineLow").value = "10";
      document.getElementById("timelineHigh").value = "14";
      break;
    case "Field":
      document.getElementById("numPayments").value = "3";
      document.getElementById("timelineLow").value = "12";
      document.getElementById("timelineHigh").value = "16";
      break;
    case "BH1":
      document.getElementById("numPayments").value = "5";
      document.getElementById("timelineLow").value = "40";
      document.getElementById("timelineHigh").value = "52";
      break;
    default:
      break;
  }
}

// Formatting functions
function formatCurrency(amount, currency, exchangeRate) {
  // Set language based on curren
  switch (currency) {
    case "CAD":
      language = "en-CA";
      break;
    case "GBP":
      language = "en-UK";
      break;
    case "EUR":
      language = "de-DE";
      break;
    case "AUD":
      language = "en-AU";
      break;
    case "USD":
      language = "en-US";
      exchangeRate = 1;
      break;
  }

  if (currency === "USD" || currency === "EUR" || currency === "GBP") {
    const formatter = new Intl.NumberFormat(language, {
      style: "currency",
      currency: currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 0,
    });

    // Format the amount
    amount = roundTo(amount * exchangeRate, 10);
    amount = formatter.format(amount);

    if (currency === "USD") {
      amount = amount + " USD";
    }
  } else {
    const formatter = new Intl.NumberFormat(language, {
      style: "currency",
      currency: currency,
      currencyDisplay: "code",
      minimumFractionDigits: 0,
    });

    amount = roundTo(amount * exchangeRate, 10);
    amount = formatter.format(amount);
  }

  return amount;
}

function QueryStringToJSON() {
  var pairs = location.search.slice(1).split("&");

  var result = {};
  pairs.forEach(function (pair) {
    pair = pair.split("=");
    result[pair[0]] = decodeURIComponent(pair[1] || "").replace("+", " ");
  });

  return JSON.parse(JSON.stringify(result));
}

// save query_string
var query_string = QueryStringToJSON();

var formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumSignificantDigits: 4,
});

var fmtPct = new Intl.NumberFormat("en-US", {
  style: "percent",
});

// Save Draft, get shortURL
function saveDraft() {
  let linkURL = document.getElementById("linkURL").href;
  linkURL = linkURL.replace(
    "file:///C:/Source/",
    "https://ddonathan.github.io/",
  );

  var myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Accept", "application/json");

  var raw = JSON.stringify({
    long_url: linkURL,
    domain: "https://thq.li/",
    api_token: "VOBpwXojb2qnELypxb1XwiGaYnH07Cy3oAX6SnRSQA4qbM09Sj3CP7EHbaKz",
  });

  var requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  fetch("https://t.ly/api/v1/link/shorten", requestOptions)
    .then((response) => response.json())
    .then((result) => {
      document.getElementById("shortUrl_tr").className = "";
      document.getElementById("shortUrl").innerHTML = result.short_url;
      document.getElementById("shortUrl2").innerHTML = result.short_url;
    })
    .catch((error) => console.error("error", error));
}

// Load File
function loadFile(url, callback) {
  PizZipUtils.getBinaryContent(url, callback);
}

// Update choices based on market
function resetChoices() {
  let package = document.getElementById("package").value;
  let market = document.getElementById("market").value;

  // Hide items that aren't available in the selected market
  switch (market) {
    case "APAC":
      // Update the currency select box
      var selectBox = document.getElementById("currency");
      selectBox.options.length = 0;
      selectBox.options.add(new Option("Australian Dollar", "AUD"));
      selectBox.options.add(new Option("US Dollar", "USD"));
      selectBox.selectedIndex = 1;

      // Hide options that aren't available
      document.getElementById("package-form-element").style.display = "none";
      document.getElementById("backoffice-form-element").style.display = "none";
      document.getElementById("invoicing-form-element").style.display = "none";
      document.getElementById("time_expense-form-element").style.display =
        "none";
      // document.getElementById('backoffice_options').style.display = 'none';
      // document.getElementById('payroll_exports_option').style.display = 'none';

      // Reset Onboarding Options
      var selectBox = document.getElementById("onboarding");
      selectBox.options.length = 0;
      selectBox.options.add(new Option("", ""));
      selectBox.options.add(new Option("SMB Edition", "onbClassic"));
      selectBox.selectedIndex = 0;

      // Reset to none
      document.getElementById("analytics").value = "";
      document.getElementById("automation").value = "";
      document.getElementById("onboarding").value = "";

      // Change the Calendly URL
      var link = document.getElementById("calendlyLink");
      link.href = "https://calendly.com/becky-thq/60min-apac";

      break;

    case "NOAM":
      // Update the currency select box
      var selectBox = document.getElementById("currency");
      selectBox.options.length = 0;
      selectBox.options.add(new Option("Canadian Dollar", "CAD"));
      selectBox.options.add(new Option("US Dollar", "USD"));
      selectBox.selectedIndex = 1;

      // Reset options
      document.getElementById("package-form-element").style.display = "flex";
      document.getElementById("backoffice-form-element").style.display = "flex";
      document.getElementById("invoicing-form-element").style.display = "block";
      document.getElementById("time_expense-form-element").style.display =
        "block";

      // Reset Onboarding Options
      var selectBox = document.getElementById("onboarding");
      selectBox.options.length = 0;
      selectBox.options.add(new Option("", ""));
      selectBox.options.add(new Option("SMB Edition", "onbClassic"));
      selectBox.options.add(new Option("365 Edition", "onb365"));
      selectBox.selectedIndex = 0;

      // Change the Calendly URL
      var link = document.getElementById("calendlyLink");
      link.href = "https://calendly.com/becky-thq/60min";

      break;

    case "EMEA":
      // Update the currency select box
      var selectBox = document.getElementById("currency");
      selectBox.options.length = 0;
      selectBox.options.add(new Option("British pound", "GBP"));
      selectBox.options.add(new Option("Euro", "EUR"));
      selectBox.options.add(new Option("US Dollar", "USD"));
      selectBox.selectedIndex = 2;

      // Hide options that aren't available
      document.getElementById("package-form-element").style.display = "none";
      document.getElementById("backoffice-form-element").style.display = "none";
      document.getElementById("invoicing-form-element").style.display = "none";
      document.getElementById("time_expense-form-element").style.display =
        "none";

      // Reset Onboarding Options
      var selectBox = document.getElementById("onboarding");
      selectBox.options.length = 0;
      selectBox.options.add(new Option("", ""));
      selectBox.options.add(new Option("SMB Edition", "onbClassic"));
      selectBox.selectedIndex = 0;

      // Change the Calendly URL
      var link = document.getElementById("calendlyLink");
      link.href = "https://calendly.com/becky-thq/60min-emea";

      break;

    case "UKI":
      // Update the currency select box
      var selectBox = document.getElementById("currency");
      selectBox.options.length = 0;
      selectBox.options.add(new Option("British pound", "GBP"));
      selectBox.options.add(new Option("Euro", "EUR"));
      selectBox.options.add(new Option("US Dollar", "USD"));
      selectBox.selectedIndex = 2;

      // Hide options that aren't available
      document.getElementById("backoffice-form-element").style.display = "none";
      document.getElementById("invoicing-form-element").style.display = "none";
      document.getElementById("time_expense-form-element").style.display =
        "none";

      // Restore options that are available
      document.getElementById("package-form-element").style.display = "flex";

      // Reset Onboarding Options
      var selectBox = document.getElementById("onboarding");
      selectBox.options.length = 0;
      selectBox.options.add(new Option("", ""));
      selectBox.options.add(new Option("SMB Edition", "onbClassic"));
      selectBox.options.add(new Option("365 Edition", "onb365"));
      selectBox.selectedIndex = 0;

      // Change the Calendly URL
      var link = document.getElementById("calendlyLink");
      link.href = "https://calendly.com/becky-thq/60min-emea";

      break;
    default:
      console.warn("No Market Selected");
  }

  // Set options to none
  document.getElementById("package").value = "";
  document.getElementById("ats").value = "";
  document.getElementById("invoicing").checked = false;
  document.getElementById("time_expense").checked = false;
  document.getElementById("analytics").value = "";
  document.getElementById("automation").value = "";
  document.getElementById("onboarding").value = "";
}

let productVisibility = {};

function hideShowFields(product) {
  // If product was not tracked before, assume it's visible and needs to be hidden
  if (!(product in productVisibility)) {
    productVisibility[product] = true;
  }

  const action = productVisibility[product] ? "none" : "block";
  const fields = document.querySelectorAll(`[data-product='${product}']`);

  for (let field of fields) {
    field.style.display = action;
  }

  // Toggle the visibility state for the next call
  productVisibility[product] = !productVisibility[product];
}

var dataTable;
var chart;
var options;
var tasks = [];

//
// Draw Gantt Chart
//
function drawGanttChart() {
  dataTable = new google.visualization.DataTable();
  // Create a DataTable with the required columns
  dataTable.addColumn("string", "Task ID");
  dataTable.addColumn("string", "Task Name");
  dataTable.addColumn("date", "Start Date");
  dataTable.addColumn("date", "End Date");
  dataTable.addColumn("number", "Duration");
  dataTable.addColumn("number", "Percent Complete");
  dataTable.addColumn("string", "Dependencies");

  // Add the tasks to the DataTable
  dataTable.addRows(tasks);

  // calculate number of tasks
  var numTasks = tasks.length;

  // Set chart options with dynamic trackHeight
  options = {
    height: numTasks * 40, // 40 pixels per task is just an example, you might adjust this according to your needs
    gantt: {
      trackHeight: 30, // keep a static trackHeight
      sortTasks: true,
      labelStyle: {
        fontName: "Arial",
        fontSize: 14,
        color: "#0095a5",
      },
      palette: [
        {
          color: "#3bbae2",
          dark: "#0095a5",
          light: "#8ed6ec",
        },
      ],
    },
  };

  // Instantiate and draw the chart
  chart = new google.visualization.Gantt(document.getElementById("chart_div"));

  // Add 'ready' event listener to the chart to render the chart as base64
  google.visualization.events.addListener(chart, "ready", function () {
    saveGanttChartAsBase64();
  });

  chart.draw(dataTable, options);

  // remove d-none class from timeline_chart
  document.getElementById("timeline_chart").classList.remove("d-none");
}

function saveGanttChartAsBase64() {
  // Get SVG element from the chart and its bounding box
  var svgElement = document.querySelector("#chart_div svg");
  var bbox = svgElement.getBBox();

  // Remove problematic SVG filters if they exist
  var filters = svgElement.querySelectorAll("filter");
  filters.forEach(function (filter) {
    filter.remove();
  });

  // Create a Canvas element
  var canvas = document.createElement("canvas");
  canvas.width = bbox.width;
  canvas.height = bbox.height;

  // Convert SVG to Canvas using Canvg
  var ctx = canvas.getContext("2d");

  var svgData = new XMLSerializer().serializeToString(svgElement);
  var dataUrl =
    "data:image/svg+xml; charset=utf8, " + encodeURIComponent(svgData);

  var img = new Image();
  img.onload = function () {
    ctx.drawImage(img, 0, 0);
    // Convert the Canvas to a PNG data URL
    var pngData = canvas.toDataURL("image/png");
    // Save the base64 string to localStorage
    localStorage.setItem("gantt_chart", pngData);
  };
  img.onerror = function (e) {
    console.error("Error in saveGanttChartAsBase64: ", e);
  };
  img.src = dataUrl;
}

function openModal() {
  var myModal = new bootstrap.Modal(
    document.getElementById("opportunityModal"),
    {},
  );
  document.getElementById("opportunityId").value = ""; // clear input field
  myModal.show();
}

async function getPricing() {
  // Get the form data as a new FormData object
  const formData = new FormData(form);

  // Validate the form data
  let errorsResult = checkValid();
  if (errorsResult?.length > 0) {
    console.error("Errors");
  }

  // Convert FormData to json
  let formProps = Object.fromEntries(formData.entries());

  // Save a copy of the formData so we can compare
  previousFormData = formProps;

  // Stringify the form data
  formProps = JSON.stringify(formProps);
  console.info("formData", formProps);

  const urlDev =
    "https://yxb3ebdvpgwc5xz3w5ixvglht40dorqd.lambda-url.us-west-2.on.aws/";
  const urlProd =
    "https://p5uwweeqrdvaabo7mwnet4whha0syuyu.lambda-url.us-west-2.on.aws/";

  // Send the form data to the fetch URL
  const response = await fetch(urlDev, {
    method: "POST",
    body: formProps,
    redirect: "follow",
  });
  if (response.ok) {
    const body = await response.json();
    console.info({ body });

    // Save the API response data to sessionStorage
    sessionStorage.setItem("pricingData", JSON.stringify(body));

    // Get Currency
    const currency = body.data.currency;
    const rate = body.calcs.rates[currency] || 1;

    // Update Results table
    document.getElementById("pricing_ballpark").innerHTML = `${
      body.calcs.total.ballparkString || "$0"
    } ${currency === "USD" ? currency : ""}`;
    document.getElementById("pricing_basePricing").innerHTML =
      `${formatCurrency(
        roundTo(body.calcs.products.low, 10),
        currency,
        rate,
      )} - ${formatCurrency(
        roundTo(body.calcs.products.high, 10),
        currency,
        rate,
      )}`;
    document.getElementById("pricing_additions").innerHTML = `${formatCurrency(
      roundTo(body.calcs.options, 10),
      currency,
      rate,
    )}`;
    document.getElementById("pricing_totalAmt").innerHTML = `${formatCurrency(
      roundTo(body.calcs.total.low, 10),
      currency,
      rate,
    )}`;

    // If we have body.data.overridePriceAmt set pricing_totalAmt to have body.calcs.total.low crossed out and body.data.overridePriceAmt next to it in red
    if (body.data.overridePriceAmt) {
      document.getElementById("pricing_totalAmt").innerHTML =
        `<span style="text-decoration: line-through;">${formatCurrency(
          roundTo(body.calcs.total.low, 10),
          currency,
          rate,
        )}</span> <span style="color: red;">${formatCurrency(
          roundTo(body.data.overridePriceAmt, 10),
          currency,
          rate,
        )}</span>`;
    }

    // Set color of button to gray
    document.getElementById("getPricing").classList.remove("btn-success");
    document.getElementById("getPricing").classList.add("btn-secondary");

    // Set number of payments depending on certain criteria
    if (
      body.calcs.total.low >= 35000 ||
      document.getElementById("automation").value ||
      document.getElementById("timelineLow").value >= 18
    ) {
      document.getElementById("numPayments").value = 4;
    }

    // Process additions
    // Loop through body.lookup.additions
    for (let entry of body.lookup.options) {
      // Object.entries(body.lookup.options).forEach(entry => {
      const key = entry.id;
      const value = entry;

      if (document.getElementById(`${key}_pricing`)) {
        let descToUse, addtlPricing;

        switch (value.method) {
          case "$":
            descToUse = formatter.format(value.pricing);
            addtlPricing = formatter.format(value.addtlPricing);
            break;

          case "%":
            // If we have a number from previously submitting it, use that instead of calculating it
            // TODO Fix issue where when a percentage is checked and then submitted, it will go to very large values. I believe it's because the actual number gets submitted and then comes back as the amount rather than the percent.
            if (value.pricing > 1 || value.pricing < -1) {
              descToUse = formatter.format(value.pricing);
            } else {
              descToUse =
                formatter.format(
                  roundTo(body.calcs.total.low * value.pricing, 10),
                ) +
                " (" +
                fmtPct.format(value.pricing) +
                ")";
            }

            if (value.addtlPricing) {
              addtlPricing =
                formatter.format(
                  roundTo(body.calcs.total.low * value.addtlPricing, 10),
                ) +
                " (" +
                fmtPct.format(value.addtlPricing) +
                ")";
            }
            break;

          case "perEach":
            descToUse = `Base: ${formatter.format(
              value.pricingBase + value.pricingEach,
              10,
            )} each, ${formatter.format(
              value.pricingEach,
              10,
            )} each additional.`;

            if (value.include > 0) {
              descToUse += ` ${value.include} included free.`;
            }

            if (value.addtlPricing) {
              addtlPricing =
                formatter.format(
                  roundTo(body.calcs.total.low * value.addtlPricing, 10),
                ) +
                " (" +
                fmtPct.format(value.addtlPricing) +
                ")";
            }
            break;

          default:
            console.error("Invalid method:", value.method);
            break;
        }

        if (value.addtlPricing) {
          descToUse += " first instance, " + addtlPricing + " each additional";
        }

        if (descToUse) {
          document.getElementById(`${key}_pricing`).innerHTML = descToUse;
        }
      } else {
        console.error(key, "not found");
      }
    }

    for (let entry of body.lookup.additionalOptional) {
      // Object.entries(body.lookup.additionalOptional).forEach(entry => {
      const key = entry.id;
      const value = entry;

      if (document.getElementById(`${key}_pricing`)) {
        let descToUse, addtlPricing;

        switch (value.method) {
          case "$":
            descToUse = formatter.format(value.pricing);
            addtlPricing = formatter.format(value.addtlPricing);

            // Look for an element with the id of key but with Amt after it and set it's value to value.pricing
            if (document.getElementById(`${key}Amt`)) {
              document.getElementById(`${key}Amt`).value = value.pricing;
            }
            break;

          case "%":
            // If we have a number from previously submitting it, use that instead of calculating it
            // TODO Fix issue where when a percentage is checked and then submitted, it will go to very large values. I believe it's because the actual number gets submitted and then comes back as the amount rather than the percent.
            if (value.pricing > 1 || value.pricing < -1) {
              descToUse = formatter.format(value.pricing);

              // Look for an element with the id of key but with Amt after it and set it's value to value.pricing
              if (document.getElementById(`${key}Amt`)) {
                document.getElementById(`${key}Amt`).value = value.pricing;
              }
            } else {
              descToUse =
                formatter.format(
                  roundTo(body.calcs.total.low * value.pricing, 10),
                ) +
                " (" +
                fmtPct.format(value.pricing) +
                ")";

              // Look for an element with the id of key but with Amt after it and set it's value to value.pricing
              if (document.getElementById(`${key}Amt`)) {
                document.getElementById(`${key}Amt`).value = roundTo(
                  body.calcs.total.low * value.pricing,
                  10,
                );
              }
            }

            if (value.addtlPricing) {
              addtlPricing =
                formatter.format(
                  roundTo(body.calcs.total.low * value.addtlPricing, 10),
                ) +
                " (" +
                fmtPct.format(value.addtlPricing) +
                ")";
            }
            break;

          case "perEach":
            descToUse = `Base: ${formatter.format(
              value.pricingBase + value.pricingEach,
              10,
            )} each, ${formatter.format(
              value.pricingEach,
              10,
            )} each additional.`;

            if (value.include > 0) {
              descToUse += ` ${value.include} included free.`;
            }

            if (value.addtlPricing) {
              addtlPricing =
                formatter.format(
                  roundTo(body.calcs.total.low * value.addtlPricing, 10),
                ) +
                " (" +
                fmtPct.format(value.addtlPricing) +
                ")";
            }
            break;

          default:
            console.error("Invalid method:", value.method);
            break;
        }

        if (value.addtlPricing) {
          descToUse += " first instance, " + addtlPricing + " each additional";
        }

        if (descToUse) {
          document.getElementById(`${key}_pricing`).innerHTML = descToUse;
        }
      } else {
        console.error(key, "not found");
      }
    }

    // funcOnSiteTraining();
    funcAfterCare();

    // Check that we're valid
    checkValid();

    // Setup for drawing the gantt chart
    let timelineDetails = {
      products: [],
      baselineLow: document.getElementById("timelineLow").value,
      baselineHigh: document.getElementById("timelineHigh").value,
      weeksLow: 0,
      weeksHigh: 0,
    };

    // Set start date of the project to today plus two weeks using dayjs
    timelineDetails.start = dayjs().add(4, "week").toDate();

    // Set end date of the ats to the start plus the baselineLow weeks
    timelineDetails.end = dayjs(timelineDetails.start)
      .add(timelineDetails.baselineHigh, "week")
      .toDate();

    // Reinitialize tasks to an empty array
    tasks = [];

    // Setup for receipt
    const itemListElement = document.getElementById("item-list");
    itemListElement.innerHTML = `<p style="text-align:center">${
      document.getElementById("clientName").value
    }</p><p style="text-align:center">${dayjs().format(
      "MM/DD/YYYY hh:mm A",
    )}</p><p style="text-align:center">${
      document.getElementById("userCount").value
    } users<br><br></p>`;
    const footerElement = document.getElementById("footer");
    footerElement.innerHTML = "";
    let total = 0;

    // Loop through body.calcs.itemized array and add items to gantt chart tasks
    body.calcs.itemized.map((item) => {
      // Add to receipt
      if (item.pricingLow || item.pricing) {
        const price = item.pricingLow || item.pricing;
        total += price;

        const itemElement = document.createElement("div");
        itemElement.classList.add("item");
        itemElement.innerHTML = `<p>${item.name}</p><p>$${price.toFixed(
          2,
        )}</p>`;
        itemListElement.appendChild(itemElement);
      }

      if (item.weeksHigh) {
        let start = dayjs(timelineDetails.end)
          .add(item.startAt, "week")
          .toDate();
        let end = dayjs(start).add(item.weeksHigh, "week").toDate();

        var durationInWeeks = item.weeksHigh;
        var millisecondsInWeek = 7 * 24 * 60 * 60 * 1000;
        var durationInMilliseconds = durationInWeeks * millisecondsInWeek;

        // Setup for gantt chart
        tasks.push([
          item.id,
          item.name,
          start,
          null,
          durationInMilliseconds,
          (item.weeksLow / item.weeksHigh) * 100,
          null,
        ]);
      }
    });

    // Add total to receipt
    const totalElement = document.createElement("div");
    totalElement.classList.add("item");
    totalElement.innerHTML = `<strong>Total</strong><p>$${total.toFixed(
      2,
    )}</p>`;
    footerElement.appendChild(totalElement);

    // Add ATS to the gantt tasks at the beginning
    if (document.getElementById("ats").value) {
      var durationInWeeks = timelineDetails.baselineHigh;
      var millisecondsInWeek = 7 * 24 * 60 * 60 * 1000;
      var durationInMilliseconds = durationInWeeks * millisecondsInWeek;
      tasks.unshift([
        "ats",
        "ATS",
        timelineDetails.start,
        null,
        durationInMilliseconds,
        (timelineDetails.baselineLow / timelineDetails.baselineHigh) * 100,
        null,
      ]);
    }

    // Draw the gantt chart
    google.charts.load("current", { packages: ["gantt"] });
    google.charts.setOnLoadCallback(drawGanttChart);
  } else {
    console.error("Request failed with status", response.status);
  }
}

// Initialize the data sources enter
document.addEventListener("DOMContentLoaded", function () {
  let dataSourcesChoices = new Choices("#dataSources", {
    delimiter: ",",
    editItems: true,
    removeItemButton: true,
    duplicateItemsAllowed: false,
    addItems: true,
    addItemFilter: function (value) {
      return value.length >= 1;
    },
  });

  const existingSystemInput = document.getElementById("existingSystem");
  existingSystemInput.addEventListener("blur", function () {
    const inputValue = existingSystemInput.value.trim();
    if (inputValue) {
      console.log("Adding value to 'dataSources':", inputValue);

      // Append the value
      const currentVal = dataSourcesChoices.getValue(true);
      dataSourcesChoices.destroy();

      // Ensure we don't add an empty value
      const combinedValue = currentVal
        ? (currentVal + "," + inputValue).split(",").filter(Boolean).join(",")
        : inputValue;

      document.getElementById("dataSources").value = combinedValue;

      // Re-initialize Choices
      dataSourcesChoices = new Choices("#dataSources", {
        delimiter: ",",
        editItems: true,
        removeItemButton: true,
        duplicateItemsAllowed: false,
        addItems: true,
        addItemFilter: function (value) {
          return value.length >= 1;
        },
      });
    }
  });
});

async function removeBlankProperties(obj) {
    for (let key in obj) {
        if (obj[key] === null || obj[key] === undefined || obj[key] === '') {
            delete obj[key];
        } else if (Array.isArray(obj[key])) {
            obj[key] = obj[key].filter(item => item !== '');
            if (obj[key].length === 0) {
                delete obj[key];
            }
        } else if (typeof obj[key] === 'object') {
            removeBlankProperties(obj[key]);
        }
    }
    return obj;
}

//
//  ██████╗ ███╗   ██╗██╗      ██████╗  █████╗ ██████╗
// ██╔═══██╗████╗  ██║██║     ██╔═══██╗██╔══██╗██╔══██╗
// ██║   ██║██╔██╗ ██║██║     ██║   ██║███████║██║  ██║
// ██║   ██║██║╚██╗██║██║     ██║   ██║██╔══██║██║  ██║
// ╚██████╔╝██║ ╚████║███████╗╚██████╔╝██║  ██║██████╔╝
// ╚═════╝ ╚═╝  ╚═══╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝
//
window.onload = function () {
  var opportunityModalElement = document.getElementById("opportunityModal");
  var myModal = new bootstrap.Modal(opportunityModalElement, {});

  document.getElementById("import").addEventListener("click", function () {
    myModal.show();
  });

  opportunityModalElement.addEventListener("shown.bs.modal", function () {
    var submitButton =
      opportunityModalElement.querySelector("#submitOpportunity");
    var opportunityIdInput =
      opportunityModalElement.querySelector("#opportunityId");

    // Set focus to the input box
    opportunityIdInput.focus();

    // Handle the enter key
    opportunityIdInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.keyCode === 13) {
        submitButton.click();
      }
    });

    // Add new click event listener

    // Add new click event listener
    submitButton.addEventListener("click", function () {
      var opportunityId = opportunityIdInput.value;
      if (opportunityId) {
        getOpportunityInfo(opportunityId);
        myModal.hide();

        // Remove modal backdrop manually
        let backdrop = document.querySelector(".modal-backdrop");
        if (backdrop && backdrop.parentNode) {
          backdrop.parentNode.removeChild(backdrop);
        }

        // Add this line to remove the 'modal-open' class from the body
        document.body.classList.remove("modal-open");
      } else {
        console.error("Opportunity ID is empty");
      }
    });

    opportunityModalElement.addEventListener("hidden.bs.modal", function () {
      let backdrop = document.querySelector(".modal-backdrop");
      if (backdrop && backdrop.parentNode) {
        backdrop.parentNode.removeChild(backdrop);
      }

      // Additionally, remove the 'modal-open' class from the body
      document.body.classList.remove("modal-open");
    });
  });

  // Check the URL for an opportunityId query parameter
  var urlParams = new URLSearchParams(window.location.search);
  var opportunityId = urlParams.get("opportunityId");
  if (opportunityId) {
    console.info("Found opportunityId in URL: " + opportunityId);
    getOpportunityInfo(opportunityId);
  }

  // getOpportunityInfo function
  async function getOpportunityInfo(opportunityId) {
    try {
      var response = await fetch(
        "https://up3s5fcw7gyqlsfhub3ehhlpli0tubgi.lambda-url.us-west-2.on.aws/?id=" +
          opportunityId,
      );
      if (response.ok) {
        var data = await response.json();
        console.info("opportunityData", data);

        // Set the values of the form elements
        document.getElementById("clientName").value = data.company.name;
        document.getElementById("userCount").value =
          data.userCount?.value || "";
        document.getElementById("existingSystem").value =
          data.legacySystem?.value || "";
        document.getElementById("currency").value = data.currency;
        document.getElementById("opportunityId").value = opportunityId;

        // Update the Update button to include the OpportunityId
        document.getElementById("update").innerHTML =
          `Update: ${opportunityId}`;

        // Update the Update button class to remove d-none
        document.getElementById("update").classList.remove("d-none");

        // Loop through data.items
        for (var i = 0; i < data.items.length; i++) {
          // Set the value of the item
          let desiredItem = data.items[i].catalogItem;

          let element = document.querySelector(
            `[data-catalog-item="${desiredItem}"]`,
          );

          if (element) {
            switch (element.tagName) {
              case "OPTION":
                element.selected = true;
                break;
              case "INPUT":
                switch (element.type) {
                  case "checkbox":
                    element.checked = true;
                    break;
                  case "number":
                    element.value = data.items[i].quantity;
                    break;
                }
                break;
            }
          }
        }

        // Hide the modal using Bootstrap's hide method
        myModal.hide();

        // Wait three seconds and run these funcBackOfficeOptions
        setTimeout(funcBackOfficeOptions, 3000);
        funcBackOfficeOptions();
        getPricing();
        checkValid();
      } else {
        console.error("Error making GET request");
        throw new Error("Error making GET request");
      }
    } catch (error) {
      console.error(error);

      // Hide the modal using Bootstrap's hide method
      myModal.hide();

      throw error;
    }
    }

  // Set name on all form elements to match the id
  var elements = document.querySelectorAll("input, select, textarea");
  for (var i = 0; i < elements.length; i++) {
    elements[i].name = elements[i].id;
  }

  // Disable "Generate Proposal" button until we have pricing
  document.getElementById("generateProposal").className =
    "btn btn-primary d-none";

  // Set focus to clientName
  document.getElementById("clientName").focus();

  // TODO Get data from ddb to set and show pricing next to items

  // Add event listener for when user count changes
  document.getElementById("userCount").addEventListener("change", function () {
    setPackageItems();
  });

  // Add event listener for when market changes
  document.getElementById("market").addEventListener("change", function () {
    resetChoices();
    setPackageItems();
  });

  // Add event listener for when package changes
  document.getElementById("package").addEventListener("change", function () {
    setPackageItems();
  });

  // Add event listener for when package changes
  document.getElementById("onboarding").addEventListener("change", function () {
    // If onboarding has a value, show onboarding_options_div
    if (document.getElementById("onboarding")) {
      document.getElementById("onboarding_options_div").className = "row mb-3";
    } else {
      document.getElementById("onboarding_options_div").className =
        "row mb-3 d-none";
    }
  });

  // Run the Back office automation
  funcBackOfficeOptions();

  // Get the form element
  const form = document.querySelector("form");

  if (form) {
    // Add an event listener for when the form changes
    form.addEventListener("change", function (event) {
      // Run the Back office automation
      funcBackOfficeOptions();

      // Check valid
      checkValid();

      // Do not run if data-noPriceRefresh is true (Note in the dataset the key is lowercase)
      if (event.target.dataset.nopricerefresh === "true") {
        return;
      }

      // Disable "Generate Proposal" button until we have pricing
      document.getElementById("generateProposal").className =
        "btn btn-primary d-none";

      // Clear the pricing table
      document.getElementById("pricing_ballpark").innerHTML = "";
      document.getElementById("pricing_basePricing").innerHTML = "";
      document.getElementById("pricing_additions").innerHTML = "";
      document.getElementById("pricing_totalAmt").innerHTML = "";

      // Change button color back to green
      document.getElementById("getPricing").classList.remove("btn-secondary");
      document.getElementById("getPricing").classList.add("btn-success");
    });

    // Add an event listener for form submission
    form.addEventListener("submit", async (event) => {
      // Prevent the default form submission behavior
      event.preventDefault();

      getPricing();
    });
  }

  // Set reset form url to the url they came in with
  document.getElementById("resetForm").addEventListener("click", function () {
    window.location = window.location.href;
  });

  // Double clicking Reset Form will reset it completely
  document
    .getElementById("resetForm")
    .addEventListener("dblclick", function () {
      window.location = "proposalCalculator2.html";
    });

  // Initialize all tooltips
  var tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]'),
  );
  var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });

  // Set values from the querystring
  for (let key in query_string) {
    // used to hold the value through this loop
    fieldId = key;

    // If we have a products list, then split it out
    if (fieldId === "products") {
      products = query_string[fieldId].split(",");

      // Loop through them and set the keyValue so we can use it to set the values in the form
      for (let product of products) {
        if (document.getElementsByName(product)) {
          fieldId = document.getElementsByName(product)[0].id;

          // Check the box for this product
          if (
            document.getElementById(fieldId) &&
            document.getElementById(fieldId).type === "checkbox"
          ) {
            document.getElementById(fieldId).checked = true;
          }
        }
      }
    }

    // If it's a checkbox, check it, otherwise set the value
    if (
      document.getElementById(fieldId) &&
      document.getElementById(fieldId).type === "checkbox"
    ) {
      document.getElementById(fieldId).checked = true;
    }
    if (
      document.getElementById(fieldId) &&
      document.getElementById(fieldId).type !== "checkbox"
    ) {
      document.getElementById(fieldId).value = query_string[fieldId];
    }
  }
};

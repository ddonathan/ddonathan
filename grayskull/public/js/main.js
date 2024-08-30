document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('login').style.display = 'none';
            document.getElementById('tracker').style.display = 'block';
            loadProgress();
            loadUserProfile();
        } else {
            alert('Login failed');
        }
    });
});

document.getElementById('registerForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const username = document.getElementById('newUsername').value;
    const password = document.getElementById('newPassword').value;
    const name = document.getElementById('name').value;
    const age = document.getElementById('age').value;
    const weight = document.getElementById('weight').value;

    fetch('/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password, name, age, weight })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Registration successful');
            showLogin();
        } else {
            alert('Registration failed');
        }
    });
});

document.getElementById('profileForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const name = document.getElementById('profileName').value;
    const age = document.getElementById('profileAge').value;
    const weight = document.getElementById('profileWeight').value;

    fetch('/updateUserProfile', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, age, weight })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Profile updated successfully');
            showTracker();
        } else {
            alert('Failed to update profile');
        }
    });
});

function showRegister() {
    document.getElementById('login').style.display = 'none';
    document.getElementById('register').style.display = 'block';
}

function showLogin() {
    document.getElementById('register').style.display = 'none';
    document.getElementById('login').style.display = 'block';
}

function showProfile() {
    document.getElementById('tracker').style.display = 'none';
    document.getElementById('profile').style.display = 'block';
    loadUserProfile();
}

function showTracker() {
    document.getElementById('profile').style.display = 'none';
    document.getElementById('tracker').style.display = 'block';
}

function logout() {
    fetch('/logout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('tracker').style.display = 'none';
            document.getElementById('login').style.display = 'block';
        } else {
            alert('Logout failed');
        }
    });
}

document.getElementById('progressForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const exercise = document.getElementById('lift').value;
    const weight = document.getElementById('weight').value;
    const reps = document.getElementById('reps').value;

    fetch('/addProgress', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ exercise, weight, reps })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadProgress();
        } else {
            alert('Failed to add progress');
        }
    });
});

function loadProgress() {
    fetch('/getProgress')
    .then(response => response.json())
    .then(data => {
        const tbody = document.getElementById('progressTable').querySelector('tbody');
        tbody.innerHTML = '';
        data.forEach(entry => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${entry.exercise}</td>
                <td>${entry.weight}</td>
                <td>${entry.reps}</td>
                <td>${new Date(entry.date).toLocaleString()}</td>
            `;
            tbody.appendChild(row);
        });
    });
}

function loadUserProfile() {
    fetch('/getUserProfile')
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const user = data.user;
            document.getElementById('profileName').value = user.name;
            document.getElementById('profileAge').value = user.age;
            document.getElementById('profileWeight').value = user.weight;
        } else {
            alert('Failed to load user profile');
        }
    });
}
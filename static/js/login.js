document.addEventListener('DOMContentLoaded', function() {
    const studentForm = document.getElementById('studentLoginForm');
    const adminForm = document.getElementById('adminLoginForm');
    const toggleButtons = document.querySelectorAll('.login-toggle');

    // Toggle between student and admin login
    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            toggleButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            if (button.dataset.type === 'student') {
                studentForm.classList.remove('hidden');
                adminForm.classList.add('hidden');
            } else {
                adminForm.classList.remove('hidden');
                studentForm.classList.add('hidden');
            }
        });
    });

    // Handle student login
    studentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const studentId = document.getElementById('studentId').value;
        const password = document.getElementById('studentPassword').value;

        // Add your student authentication logic here
        // For demo purposes, redirect to appointment page
        window.location.href = '/studentdash';
    });

    // Handle admin login
    adminForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('adminUsername').value;
        const password = document.getElementById('adminPassword').value;

        // Add your admin authentication logic here
        // For demo purposes, redirect to admin dashboard
        window.location.href = '/admindash';
    });
});
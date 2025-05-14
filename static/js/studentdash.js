const listEl   = document.getElementById('appointmentsList');
const studentId = Number(listEl.dataset.studentId);

document.addEventListener('DOMContentLoaded', function () {
    const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {
        id: '24262549',
        name: 'Antonette Jean Ignacio',
        type: 'student'
    };

    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    const appointmentForm = document.getElementById('appointmentForm');
    const clearFormBtn = document.getElementById('clearFormBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const statusFilter = document.getElementById('statusFilter');
    const studentNameInput = document.getElementById('studentName');
    const studentIdInput = document.getElementById('studentId');
    const submitBtnText = document.getElementById('submitBtnText');
    const currentPageTitle = document.getElementById('currentPageTitle');
    const notificationBadge = document.getElementById('notificationCount');

    studentNameInput.value = currentUser.name;
    studentIdInput.value = currentUser.id;
    studentNameInput.readOnly = true;
    studentIdInput.readOnly = true;

    document.querySelector('.profile-section #studentName').textContent = currentUser.name;
    document.querySelector('.profile-section #studentId').textContent = `ID: ${currentUser.id}`;

    navItems.forEach(item => {
        item.addEventListener('click', function (e) {
            if (this.classList.contains('logout')) {
                logout();
                return;
            }

            e.preventDefault();
            navItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');

            const targetPage = this.getAttribute('data-page');
            switchPage(targetPage);
        });
    });

    function logout() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('appointments');
        localStorage.removeItem('studentNotifications');
        localStorage.removeItem('adminNotifications');
        window.location.href = '/login';
    }

    function switchPage(pageId) {
        pages.forEach(p => p.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');

        switch (pageId) {
            case 'appointments':
                currentPageTitle.textContent = 'My Appointments';
                loadAppointments(statusFilter.value);
                break;
            case 'book':
                currentPageTitle.textContent = 'Book New Appointment';
                break;
            case 'notifications':
                currentPageTitle.textContent = 'Notifications';
                loadStudentNotifications();
                markAllNotificationsAsRead();
                break;
        }
    }

    appointmentForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const formData = {
            id: this.dataset.editId ? parseInt(this.dataset.editId) : Date.now(),
            studentId: currentUser.id,
            studentName: currentUser.name,
            date: document.getElementById('appointmentDate').value,
            time: document.getElementById('appointmentTime').value,
            type: document.getElementById('appointmentType').value,
            symptoms: document.getElementById('symptoms').value,
            status: 'pending',
            timestamp: new Date().toISOString(),
            read: false
        };

        if (this.dataset.editId) {
            updateAppointment(formData);
        } else {
            createAppointment(formData);
        }

        resetForm();
        switchPage('appointments');
    });

    clearFormBtn.addEventListener('click', resetForm);

    clearAllBtn.addEventListener('click', function () {
        if (confirm('Are you sure you want to clear all appointments?')) {
            const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
            const userAppointments = appointments.filter(app => app.studentId === currentUser.id);
            if (userAppointments.length > 0) {
                const adminNotification = {
                    id: Date.now(),
                    type: 'appointments_cleared',
                    studentId: currentUser.id,
                    studentName: currentUser.name,
                    message: `${currentUser.name} has cleared all their appointments.`,
                    timestamp: new Date().toISOString(),
                    read: false
                };

                const adminNotifications = JSON.parse(localStorage.getItem('adminNotifications')) || [];
                adminNotifications.push(adminNotification);
                localStorage.setItem('adminNotifications', JSON.stringify(adminNotifications));

                createStudentNotification({
                    studentId: currentUser.id,
                    message: `You cleared all your appointments.`
                });
            }

            const updated = appointments.filter(app => app.studentId !== currentUser.id);
            localStorage.setItem('appointments', JSON.stringify(updated));
            loadAppointments();
            showNotification('All appointments cleared!');
        }
    });

    statusFilter.addEventListener('change', function () {
        loadAppointments(this.value);
    });

    function createAppointment(data) {
        const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
        appointments.push(data);
        localStorage.setItem('appointments', JSON.stringify(appointments));

        const adminNotification = {
            id: Date.now(),
            type: 'new_appointment',
            appointmentId: data.id,
            studentId: data.studentId,
            studentName: data.studentName,
            message: `New appointment request from ${data.studentName} for ${formatDate(data.date)} at ${formatTime(data.time)}.`,
            timestamp: new Date().toISOString(),
            read: false
        };

        const adminNotifications = JSON.parse(localStorage.getItem('adminNotifications')) || [];
        adminNotifications.push(adminNotification);
        localStorage.setItem('adminNotifications', JSON.stringify(adminNotifications));

        createStudentNotification({
            studentId: data.studentId,
            message: `You booked a new appointment on ${formatDate(data.date)} at ${formatTime(data.time)}.`
        });

        showNotification('Appointment booked!');
    }

    function updateAppointment(data) {
        const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
        const index = appointments.findIndex(app => app.id === data.id);

        if (index !== -1) {
            const old = appointments[index];
            data.status = old.status;
            data.reason = old.reason;

            appointments[index] = data;
            localStorage.setItem('appointments', JSON.stringify(appointments));

            const changes = [];
            if (old.date !== data.date) changes.push(`date from ${formatDate(old.date)} to ${formatDate(data.date)}`);
            if (old.time !== data.time) changes.push(`time from ${formatTime(old.time)} to ${formatTime(data.time)}`);
            if (old.type !== data.type) changes.push(`type from ${old.type} to ${data.type}`);

            if (changes.length > 0) {
                const adminNotification = {
                    id: Date.now(),
                    type: 'appointment_updated',
                    appointmentId: data.id,
                    studentId: data.studentId,
                    studentName: data.studentName,
                    message: `${data.studentName} updated appointment: ${changes.join(', ')}.`,
                    timestamp: new Date().toISOString(),
                    read: false
                };

                const adminNotifications = JSON.parse(localStorage.getItem('adminNotifications')) || [];
                adminNotifications.push(adminNotification);
                localStorage.setItem('adminNotifications', JSON.stringify(adminNotifications));

                createStudentNotification({
                    studentId: data.studentId,
                    message: `You updated your appointment: ${changes.join(', ')}.`
                });
            }

            showNotification('Appointment updated!');
        }
    }

    function createStudentNotification(data) {
        const studentNotifications = JSON.parse(localStorage.getItem('studentNotifications')) || [];
        studentNotifications.push({
            id: Date.now(),
            studentId: data.studentId,
            message: data.message,
            timestamp: new Date().toISOString(),
            read: false
        });
        localStorage.setItem('studentNotifications', JSON.stringify(studentNotifications));
    }


    fetch(`/api/appointments?studentId=${currentUser.id}`)
  .then(res => {
    if (!res.ok) throw new Error('Failed to fetch appointments');
    return res.json();
  })
  .then(data => {
    appointments = data;         // store in memory
    loadAppointments('all');     // render immediately
  })
  .catch(err => {
    console.error(err);
    document.getElementById('appointmentsList')
      .innerHTML = '<div class="empty-message">Could not load appointments.</div>';
  });

 function loadAppointments(filter = 'all') {
  const list = document.getElementById('appointmentsList');

  // Filter & sort directly on the in-memory array
  const filtered = appointments
    .filter(a => a.student_id === Number(currentUser.id) &&
                 (filter === 'all' || a.status === filter));
  const sorted = filtered
    .sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));

  if (sorted.length === 0) {
    list.innerHTML = '<div class="empty-message">No appointments found</div>';
    return;
  }

  list.innerHTML = sorted.map(app => `
    <div class="appointment-card ${app.status}">
      <h3>${app.type}</h3>
      <p><strong>Date:</strong> ${formatDate(app.appointment_date)}</p>
      <p><strong>Time:</strong> ${formatTime(app.appointment_time)}</p>
      <p><strong>Status:</strong> <span class="status-${app.status}">${app.status}</span></p>
      <p><strong>Symptoms:</strong> ${app.reason || ''}</p>
      ${app.status === 'pending' ? `
        <div class="form-actions">
          <button onclick="editAppointment(${app.id})" class="secondary-btn">
            <i class="fas fa-edit"></i> Edit
          </button>
          <button onclick="deleteAppointment(${app.id})" class="danger-btn">
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
      ` : app.reason ? `<p class="reason"><strong>Reason:</strong> ${app.reason}</p>` : ''}
    </div>
  `).join('');
}

    function resetForm() {
        appointmentForm.reset();
        delete appointmentForm.dataset.editId;
        studentNameInput.value = currentUser.name;
        studentIdInput.value = currentUser.id;
        submitBtnText.textContent = 'Book Appointment';
    }

    function showNotification(msg) {
        alert(msg);
    }

    function formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function formatTime(timeStr) {
        const [h, m] = timeStr.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        return `${(hour % 12 || 12)}:${m} ${ampm}`;
    }

    function updateNotificationCount() {
        const studentNotifications = JSON.parse(localStorage.getItem('studentNotifications')) || [];
        const unread = studentNotifications.filter(n => !n.read && n.studentId === currentUser.id);
        notificationBadge.textContent = unread.length || '';
        notificationBadge.style.display = unread.length > 0 ? 'inline-block' : 'none';
    }

    function loadStudentNotifications() {
        const studentNotifications = JSON.parse(localStorage.getItem('studentNotifications')) || [];
        const studentNotifs = studentNotifications.filter(n => n.studentId === currentUser.id);
        const list = document.getElementById('notificationList');

        if (!studentNotifs.length) {
            list.innerHTML = '<div class="empty-message">No notifications</div>';
            return;
        }

        list.innerHTML = studentNotifs.map(n => `
            <div class="notification-card ${n.read ? '' : 'unread'}">
                <p>${n.message}</p>
                <small>${new Date(n.timestamp).toLocaleString()}</small>
            </div>
        `).join('');
    }

    function markAllNotificationsAsRead() {
        const notifs = JSON.parse(localStorage.getItem('studentNotifications')) || [];
        const updated = notifs.map(n => n.studentId === currentUser.id ? { ...n, read: true } : n);
        localStorage.setItem('studentNotifications', JSON.stringify(updated));
        updateNotificationCount();
    }

    // Initial Load
    loadAppointments();
    updateNotificationCount();

    setInterval(() => {
        if (document.getElementById('appointments').classList.contains('active')) {
            loadAppointments(statusFilter.value);
        }
        updateNotificationCount();
    }, 10000);
});

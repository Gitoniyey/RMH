// studentdash.js
document.addEventListener('DOMContentLoaded', function() {
    // Initialize page
    initDashboard();
    loadStudentInfo();
    loadAppointments();
    loadNotifications();
    setupEventListeners();
});

// Dashboard initialization
function initDashboard() {
    // Set the active navigation menu item
    document.querySelectorAll('.nav-item').forEach(navItem => {
        navItem.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all nav items
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Add active class to clicked nav item
            this.classList.add('active');
            
            // Hide all pages
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            
            // Show selected page
            const pageId = this.getAttribute('data-page');
            document.getElementById(pageId).classList.add('active');
            
            // Update page title
            const pageTitles = {
                'appointments': 'My Appointments',
                'book': 'Book New Appointment',
                'notifications': 'Notifications'
            };
            document.getElementById('currentPageTitle').textContent = pageTitles[pageId];
        });
    });
}

// Load student information
function loadStudentInfo() {
    // In a real app, this would come from the server
    // Using session data from Flask backend
    fetch('/api/student/info')
        .then(response => response.json())
        .then(data => {
            document.querySelectorAll('#studentName').forEach(el => {
                el.textContent = data.full_name;
            });
            document.querySelectorAll('#studentId').forEach(el => {
                if (el.tagName === 'P') {
                    el.textContent = 'ID: ' + data.student_id;
                } else if (el.tagName === 'INPUT') {
                    el.value = data.student_id;
                }
            });
            
            // If we have an input with student name in the form
            const studentNameInput = document.querySelector('#appointmentForm #studentName');
            if (studentNameInput) {
                studentNameInput.value = data.full_name;
            }
        })
        .catch(error => {
            console.error('Error loading student info:', error);
        });
}

// Load appointments
function loadAppointments() {
    fetch('/api/appointments')
        .then(response => response.json())
        .then(appointments => {
            displayAppointments(appointments);
            updateStatusFilter();
        })
        .catch(error => {
            console.error('Error loading appointments:', error);
        });
}

// Display appointments in the grid
function displayAppointments(appointments) {
    const appointmentsList = document.getElementById('appointmentsList');
    appointmentsList.innerHTML = '';
    
    if (appointments.length === 0) {
        appointmentsList.innerHTML = '<div class="no-appointments">No appointments found</div>';
        return;
    }
    
    appointments.forEach(appointment => {
        // Format date for display
        const appointmentDate = new Date(appointment.appointment_date);
        const formattedDate = appointmentDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // Format time for display
        const timeArr = appointment.appointment_time.split(':');
        const hours = parseInt(timeArr[0]);
        const minutes = timeArr[1];
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 || 12;
        const formattedTime = `${formattedHours}:${minutes} ${ampm}`;
        
        // Create appointment card
        const appointmentCard = document.createElement('div');
        appointmentCard.className = `appointment-card ${appointment.status}`;
        appointmentCard.dataset.id = appointment.appointment_id;
        
        appointmentCard.innerHTML = `
            <div class="appointment-status">
                <span class="status-indicator"></span>
                <span class="status-text">${appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}</span>
            </div>
            <div class="appointment-type">
                <i class="fas ${getAppointmentTypeIcon(appointment.appointment_type)}"></i>
                <h3>${appointment.appointment_type.charAt(0).toUpperCase() + appointment.appointment_type.slice(1)}</h3>
            </div>
            <div class="appointment-datetime">
                <div class="appointment-date">
                    <i class="fas fa-calendar-day"></i>
                    <span>${formattedDate}</span>
                </div>
                <div class="appointment-time">
                    <i class="fas fa-clock"></i>
                    <span>${formattedTime}</span>
                </div>
            </div>
            <div class="appointment-reason">
                <h4>Reason:</h4>
                <p>${appointment.symptoms_reason}</p>
            </div>
            <div class="appointment-actions">
                ${appointment.status === 'pending' ? 
                    `<button class="cancel-btn" onclick="cancelAppointment('${appointment.appointment_id}')">
                        <i class="fas fa-times"></i> Cancel
                    </button>` : ''}
            </div>
        `;
        
        appointmentsList.appendChild(appointmentCard);
    });
}

// Get appropriate icon for appointment type
function getAppointmentTypeIcon(type) {
    const icons = {
        'medical': 'fa-stethoscope',
        'consultation': 'fa-comment-medical',
        'emergency': 'fa-ambulance',
        'followup': 'fa-clipboard-check'
    };
    
    return icons[type] || 'fa-calendar-check';
}

// Update the status filter functionality
function updateStatusFilter() {
    const statusFilter = document.getElementById('statusFilter');
    
    statusFilter.addEventListener('change', function() {
        const selectedStatus = this.value;
        
        const appointmentCards = document.querySelectorAll('.appointment-card');
        appointmentCards.forEach(card => {
            if (selectedStatus === 'all' || card.classList.contains(selectedStatus)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    });
}

// Cancel an appointment
function cancelAppointment(appointmentId) {
    if (confirm('Are you sure you want to cancel this appointment?')) {
        fetch(`/api/appointments/${appointmentId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Remove the appointment card from the DOM
                const appointmentCard = document.querySelector(`.appointment-card[data-id="${appointmentId}"]`);
                if (appointmentCard) {
                    appointmentCard.remove();
                }
                
                // Check if there are no more appointments
                const appointmentsList = document.getElementById('appointmentsList');
                if (appointmentsList.children.length === 0) {
                    appointmentsList.innerHTML = '<div class="no-appointments">No appointments found</div>';
                }
                
                // Reload notifications (as a new notification about cancellation may have been created)
                loadNotifications();
            } else {
                alert('Failed to cancel appointment. Please try again.');
            }
        })
        .catch(error => {
            console.error('Error cancelling appointment:', error);
            alert('An error occurred while cancelling the appointment.');
        });
    }
}

// Load notifications
function loadNotifications() {
    fetch('/api/notifications')
        .then(response => response.json())
        .then(notifications => {
            displayNotifications(notifications);
            updateNotificationBadge(notifications);
        })
        .catch(error => {
            console.error('Error loading notifications:', error);
        });
}

// Display notifications
function displayNotifications(notifications) {
    const notificationList = document.getElementById('notificationList');
    notificationList.innerHTML = '';
    
    if (notifications.length === 0) {
        notificationList.innerHTML = '<div class="no-notifications">No notifications</div>';
        return;
    }
    
    notifications.forEach(notification => {
        const notificationItem = document.createElement('div');
        notificationItem.className = `notification-item ${notification.read_status ? 'read' : 'unread'}`;
        notificationItem.dataset.id = notification.notification_id;
        
        const createdDate = new Date(notification.created_at);
        const formattedDate = createdDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        const formattedTime = createdDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        notificationItem.innerHTML = `
            <div class="notification-header">
                <div class="notification-type">
                    <i class="fas ${getNotificationTypeIcon(notification.type)}"></i>
                    <span>${formatNotificationType(notification.type)}</span>
                </div>
                <div class="notification-date">
                    ${formattedDate} at ${formattedTime}
                </div>
            </div>
            <div class="notification-message">
                ${notification.message}
            </div>
            ${notification.related_appointment_id ? 
                `<div class="notification-actions">
                    <button class="view-appointment-btn" onclick="viewAppointment('${notification.related_appointment_id}')">
                        <i class="fas fa-eye"></i> View Appointment
                    </button>
                </div>` : ''}
        `;
        
        notificationList.appendChild(notificationItem);
        
        // Mark notification as read when clicked
        notificationItem.addEventListener('click', function() {
            if (!this.classList.contains('read')) {
                markNotificationAsRead(notification.notification_id);
                this.classList.add('read');
                this.classList.remove('unread');
                
                // Update notification badge
                updateNotificationBadge(notifications.map(n => {
                    if (n.notification_id === notification.notification_id) {
                        n.read_status = true;
                    }
                    return n;
                }));
            }
        });
    });
    
    // Add Mark All as Read button
    const markAllReadBtn = document.createElement('button');
    markAllReadBtn.className = 'mark-all-read-btn';
    markAllReadBtn.innerHTML = '<i class="fas fa-check-double"></i> Mark All as Read';
    markAllReadBtn.addEventListener('click', markAllNotificationsAsRead);
    
    const clearAllBtn = document.createElement('button');
    clearAllBtn.className = 'clear-all-btn';
    clearAllBtn.innerHTML = '<i class="fas fa-trash"></i> Clear All';
    clearAllBtn.addEventListener('click', clearAllNotifications);
    
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'notification-global-actions';
    actionsDiv.appendChild(markAllReadBtn);
    actionsDiv.appendChild(clearAllBtn);
    
    notificationList.insertBefore(actionsDiv, notificationList.firstChild);
}

// Get appropriate icon for notification type
function getNotificationTypeIcon(type) {
    const icons = {
        'new_appointment': 'fa-calendar-plus',
        'cancelled_appointment': 'fa-calendar-times',
        'appointment_status': 'fa-calendar-check',
        'reminder': 'fa-bell'
    };
    
    return icons[type] || 'fa-bell';
}

// Format notification type for display
function formatNotificationType(type) {
    const types = {
        'new_appointment': 'New Appointment',
        'cancelled_appointment': 'Cancelled Appointment',
        'appointment_status': 'Status Update',
        'reminder': 'Reminder'
    };
    
    return types[type] || type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Mark a notification as read
function markNotificationAsRead(notificationId) {
    fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            notification_ids: [notificationId]
        })
    })
    .catch(error => {
        console.error('Error marking notification as read:', error);
    });
}

// Mark all notifications as read
function markAllNotificationsAsRead() {
    fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update all notification items in the DOM
            document.querySelectorAll('.notification-item').forEach(item => {
                item.classList.add('read');
                item.classList.remove('unread');
            });
            
            // Update notification badge
            updateNotificationBadge([]);
        }
    })
    .catch(error => {
        console.error('Error marking all notifications as read:', error);
    });
}

// Clear all notifications
function clearAllNotifications() {
    if (confirm('Are you sure you want to clear all notifications? This cannot be undone.')) {
        fetch('/api/notifications/clear', {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Clear notification list in the DOM
                const notificationList = document.getElementById('notificationList');
                notificationList.innerHTML = '<div class="no-notifications">No notifications</div>';
                
                // Update notification badge
                updateNotificationBadge([]);
            }
        })
        .catch(error => {
            console.error('Error clearing notifications:', error);
        });
    }
}

// Update notification badge
function updateNotificationBadge(notifications) {
    const unreadCount = notifications.filter(notification => !notification.read_status).length;
    const notificationBadge = document.getElementById('notificationCount');
    
    if (unreadCount > 0) {
        notificationBadge.textContent = unreadCount;
        notificationBadge.style.display = 'block';
    } else {
        notificationBadge.style.display = 'none';
    }
}

// Navigate to specific appointment from notification
function viewAppointment(appointmentId) {
    // Switch to appointments page
    document.querySelector('.nav-item[data-page="appointments"]').click();
    
    // Highlight the specific appointment
    setTimeout(() => {
        const appointmentCard = document.querySelector(`.appointment-card[data-id="${appointmentId}"]`);
        if (appointmentCard) {
            appointmentCard.scrollIntoView({ behavior: 'smooth' });
            appointmentCard.classList.add('highlight');
            
            setTimeout(() => {
                appointmentCard.classList.remove('highlight');
            }, 3000);
        }
    }, 300);
}

// Setup event listeners
function setupEventListeners() {
    // Appointment form submission
    const appointmentForm = document.getElementById('appointmentForm');
    if (appointmentForm) {
        appointmentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const appointmentData = {
                appointment_date: this.querySelector('#appointmentDate').value,
                appointment_time: this.querySelector('#appointmentTime').value,
                appointment_type: this.querySelector('#appointmentType').value,
                symptoms_reason: this.querySelector('#symptoms').value
            };
            
            // Submit appointment to server
            fetch('/api/appointments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(appointmentData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Clear form
                    appointmentForm.reset();
                    
                    // Show success message
                    alert('Appointment booked successfully!');
                    
                    // Switch to appointments page
                    document.querySelector('.nav-item[data-page="appointments"]').click();
                    
                    // Reload appointments and notifications
                    loadAppointments();
                    loadNotifications();
                } else {
                    alert('Failed to book appointment. Please try again.');
                }
            })
            .catch(error => {
                console.error('Error booking appointment:', error);
                alert('You Successfully Booked an Appointment!');
            });
        });
    }
    
    // Clear form button
    const clearFormBtn = document.getElementById('clearFormBtn');
    if (clearFormBtn) {
        clearFormBtn.addEventListener('click', function() {
            document.getElementById('appointmentForm').reset();
        });
    }
    
    // Clear all appointments button
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to cancel all pending appointments? This cannot be undone.')) {
                // Get all pending appointment IDs
                const pendingAppointments = Array.from(document.querySelectorAll('.appointment-card.pending')).map(card => card.dataset.id);
                
                if (pendingAppointments.length === 0) {
                    alert('No pending appointments to cancel.');
                    return;
                }
                
                // Create promises for all cancellations
                const cancellationPromises = pendingAppointments.map(id => {
                    return fetch(`/api/appointments/${id}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }).then(response => response.json());
                });
                
                // Wait for all cancellations to complete
                Promise.all(cancellationPromises)
                    .then(results => {
                        // Reload appointments and notifications
                        loadAppointments();
                        loadNotifications();
                        
                        alert('All pending appointments have been cancelled.');
                    })
                    .catch(error => {
                        console.error('Error cancelling appointments:', error);
                        alert('An error occurred while cancelling appointments.');
                    });
            }
        });
    }
}

// Logout function
function logout() {
    window.location.href = '/login';
}
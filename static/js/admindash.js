document.addEventListener('DOMContentLoaded', function() {
    const notificationCount = document.getElementById('notification-count');
    const recentAppointments = document.getElementById('recent-appointments');
    const allAppointments = document.getElementById('all-appointments');
    const studentList = document.getElementById('student-list');
    const statusFilter = document.getElementById('status-filter');
    const menuLinks = document.querySelectorAll('.admin-menu a');
    const sections = document.querySelectorAll('.section');
    const currentSectionTitle = document.getElementById('current-section-title');
    const modal = document.getElementById('appointment-modal');
    const closeModal = document.querySelector('.close-modal');
    const studentSearch = document.getElementById('student-search');
    
    // Function to fetch all appointments from the database
    function fetchAllAppointments() {
        fetch('/api/admin/appointments')
            .then(response => response.json())
            .then(data => {
                // Process appointment data for admin dashboard
                const formattedAppointments = data.map(app => ({
                    id: app.appointment_id,
                    date: app.appointment_date,
                    time: app.appointment_time,
                    studentId: app.student_id,
                    studentName: app.student_name || `Student ${app.student_id}`,
                    type: app.appointment_type,
                    status: app.status,
                    reason: app.symptoms_reason,
                    timestamp: app.created_at,
                    read: false
                }));
                
                // Update localStorage with the latest appointments
                localStorage.setItem('appointments', JSON.stringify(formattedAppointments));
                
                // Update the UI
                loadRecentAppointments();
                if (typeof loadAllAppointments === 'function' && statusFilter) {
                    loadAllAppointments(statusFilter.value);
                }
                updateDashboardStats();
            })
            .catch(error => {
                console.error('Error fetching appointments:', error);
            });
    }

    // Function to fetch admin notifications
    function fetchAdminNotifications() {
        fetch('/api/admin/notifications')
            .then(response => response.json())
            .then(data => {
                // Get existing notifications
                const existingNotifications = JSON.parse(localStorage.getItem('adminNotifications')) || [];
                
                // Merge with new data, avoiding duplicates
                const combinedNotifications = [...existingNotifications];
                
                // Add new notifications that don't already exist
                data.forEach(newNotification => {
                    const exists = combinedNotifications.some(
                        existing => existing.notification_id === newNotification.notification_id
                    );
                    if (!exists) {
                        combinedNotifications.push(newNotification);
                    }
                });
                
                // Store merged notifications
                localStorage.setItem('adminNotifications', JSON.stringify(combinedNotifications));
                
                // Update the UI
                if (typeof loadAdminNotifications === 'function') {
                    loadAdminNotifications();
                }
                checkNotifications();
            })
            .catch(error => {
                console.error('Error fetching admin notifications:', error);
            });
    }
    
    // Navigation between sections
    menuLinks.forEach(link => {
        if (link.textContent.includes('Logout')) return;
        
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            
            // Update active menu item
            menuLinks.forEach(menuLink => {
                if (!menuLink.textContent.includes('Logout')) {
                    menuLink.parentElement.classList.remove('active');
                }
            });
            this.parentElement.classList.add('active');
            
            // Show the target section
            sections.forEach(section => {
                section.classList.remove('active');
            });
            document.getElementById(`section-${targetId}`).classList.add('active');
            
            // Update section title
            currentSectionTitle.textContent = targetId.charAt(0).toUpperCase() + targetId.slice(1);
            
            // Update content based on section
            if (targetId === 'dashboard') {
                loadRecentAppointments();
                updateDashboardStats();
            } else if (targetId === 'appointments') {
                loadAllAppointments(statusFilter.value);
            } else if (targetId === 'students') {
                loadStudents();
            } else if (targetId === 'notifications') {
                loadAdminNotifications();
                markAllAdminNotificationsAsRead();
            }
        });
    });
    
    // Handle "View All" link
    document.querySelector('.view-all').addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelector('a[href="#appointments"]').click();
    });
    
    // Status filter change
    statusFilter.addEventListener('change', function() {
        loadAllAppointments(this.value);
    });
    
    // Student search
    if (studentSearch) {
        studentSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const students = document.querySelectorAll('#student-list tr');
            
            students.forEach(row => {
                if (!row.querySelector('td:nth-child(2)')) return;
                
                const name = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
                const id = row.querySelector('td:nth-child(1)').textContent.toLowerCase();
                
                if (name.includes(searchTerm) || id.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
    
    // Close modal
    if (closeModal) {
        closeModal.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (modal && event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Check for new notifications
    function checkNotifications() {
        const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
        const adminNotifications = JSON.parse(localStorage.getItem('adminNotifications')) || [];
        
        // Count unread items from both sources
        const unreadAppointments = appointments.filter(app => !app.read).length;
        const unreadNotifications = adminNotifications.filter(note => !note.read_status).length;
        const totalUnread = unreadAppointments + unreadNotifications;
        
        notificationCount.textContent = totalUnread;
        notificationCount.style.display = totalUnread > 0 ? 'inline-block' : 'none';
    }
    
    // Update dashboard statistics
    function updateDashboardStats() {
        const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
        
        // Count appointments for today
        const today = new Date().toISOString().split('T')[0];
        const todayCount = appointments.filter(app => app.date === today).length;
        
        // Count by status
        const pendingCount = appointments.filter(app => app.status === 'pending').length;
        const approvedCount = appointments.filter(app => app.status === 'approved').length;
        const rejectedCount = appointments.filter(app => app.status === 'rejected').length;
        
        // Update stat cards
        document.getElementById('today-count').textContent = todayCount;
        document.getElementById('pending-count').textContent = pendingCount;
        document.getElementById('approved-count').textContent = approvedCount;
        document.getElementById('rejected-count').textContent = rejectedCount;
    }
    
    // Load recent appointments for dashboard
    function loadRecentAppointments() {
        const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
        
        console.log("All appointments:", appointments);
        
        if (!recentAppointments) {
            console.error("Recent appointments container not found");
            return;
        }
        
        recentAppointments.innerHTML = '';
        
        // Sort by date (newest first) and take only most recent 5
        const recent = [...appointments]
            .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
            .slice(0, 5);
            
        console.log("Recent appointments to display:", recent);
        
        if (recent.length === 0) {
            recentAppointments.innerHTML = '<tr><td colspan="7" class="empty-table">No appointments found</td></tr>';
            return;
        }
        
        recent.forEach(app => {
            const row = document.createElement('tr');
            row.className = app.read ? '' : 'unread-row';
            
            // Ensure we always have all fields for display
            const safeApp = {
                id: app.id || Date.now(),
                date: app.date || '',
                time: app.time || '',
                studentId: app.studentId || 'N/A',
                studentName: app.studentName || 'N/A',
                type: app.type || 'N/A',
                status: app.status || 'pending',
                read: app.read || false
            };
            
            row.innerHTML = `
                <td>${formatDate(safeApp.date)}</td>
                <td>${formatTime(safeApp.time)}</td>
                <td>${safeApp.studentId}</td>
                <td>${safeApp.studentName}</td>
                <td>${safeApp.type}</td>
                <td class="status-${safeApp.status}">${safeApp.status}</td>
                <td>
                    <button onclick="viewAppointment(${safeApp.id})" class="view-btn">View</button>
                    ${safeApp.status === 'pending' ? `
                    <button onclick="approveAppointment(${safeApp.id})" class="approve-btn">Approve</button>
                    <button onclick="rejectAppointment(${safeApp.id})" class="reject-btn">Reject</button>
                    ` : ''}
                </td>
            `;
            
            recentAppointments.appendChild(row);
        });
    }
    
    // Load all appointments with optional filtering
    function loadAllAppointments(status = 'all') {
        const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
        
        if (!allAppointments) {
            console.error("All appointments container not found");
            return;
        }
        
        allAppointments.innerHTML = '';
        
        const filtered = status === 'all' ? 
            appointments : 
            appointments.filter(app => app.status === status);
            
        console.log("Filtered appointments:", filtered);
        
        if (filtered.length === 0) {
            allAppointments.innerHTML = '<tr><td colspan="7" class="empty-table">No appointments found</td></tr>';
            return;
        }
        
        // Sort by date (newest first)
        const sorted = [...filtered].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        
        sorted.forEach(app => {
            const row = document.createElement('tr');
            row.className = app.read ? '' : 'unread-row';
            
            // Ensure we always have all fields for display
            const safeApp = {
                id: app.id || Date.now(),
                date: app.date || '',
                time: app.time || '',
                studentId: app.studentId || 'N/A',
                studentName: app.studentName || 'N/A',
                type: app.type || 'N/A',
                status: app.status || 'pending',
                read: app.read || false
            };
            
            row.innerHTML = `
                <td>${formatDate(safeApp.date)}</td>
                <td>${formatTime(safeApp.time)}</td>
                <td>${safeApp.studentId}</td>
                <td>${safeApp.studentName}</td>
                <td>${safeApp.type}</td>
                <td class="status-${safeApp.status}">${safeApp.status}</td>
                <td>
                    <button onclick="viewAppointment(${safeApp.id})" class="view-btn">View</button>
                    ${safeApp.status === 'pending' ? `
                    <button onclick="approveAppointment(${safeApp.id})" class="approve-btn">Approve</button>
                    <button onclick="rejectAppointment(${safeApp.id})" class="reject-btn">Reject</button>
                    ` : ''}
                </td>
            `;
            
            allAppointments.appendChild(row);
        });
    }
    
    // Load admin notifications
    function loadAdminNotifications() {
        const container = document.getElementById('admin-notifications-list');
        if (!container) {
            console.error("Admin notifications container not found");
            return;
        }
        
        const adminNotifications = JSON.parse(localStorage.getItem('adminNotifications')) || [];
        
        console.log("Admin notifications:", adminNotifications);
        
        if (adminNotifications.length === 0) {
            container.innerHTML = '<div class="empty-notification">No notifications</div>';
            return;
        }
        
        // Sort by timestamp (newest first)
        const sorted = [...adminNotifications].sort((a, b) => new Date(b.created_at || b.timestamp) - new Date(a.created_at || a.timestamp));
        
        container.innerHTML = sorted.map((notification) => `
            <div class="notification-item ${notification.read_status ? '' : 'unread'}" 
                 onclick="markAdminNotificationAsRead(${notification.notification_id})">
                <div class="notification-header">
                    <span class="notification-type">${notification.type ? notification.type.replace(/_/g, ' ') : 'notification'}</span>
                    <span class="notification-time">${formatDate(notification.created_at || notification.timestamp)}</span>
                </div>
                <p>${notification.message}</p>
                ${notification.related_appointment_id ? `
                    <button class="view-related-btn" onclick="viewRelatedAppointment(${notification.related_appointment_id}, event)">
                        View Related Appointment
                    </button>` : ''}
            </div>
        `).join('');
    }
    
    // Mark all admin notifications as read
    function markAllAdminNotificationsAsRead() {
        const adminNotifications = JSON.parse(localStorage.getItem('adminNotifications')) || [];
        
        if (adminNotifications.length === 0) return;
        
        // Mark all as read in the UI
        document.querySelectorAll('#admin-notifications-list .notification-item').forEach(item => {
            item.classList.remove('unread');
            item.classList.add('read');
        });
        
        // Update localStorage
        const updated = adminNotifications.map(notification => {
            notification.read_status = true;
            return notification;
        });
        
        localStorage.setItem('adminNotifications', JSON.stringify(updated));
        
        // Update API
        fetch('/api/admin/notifications/mark-read', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                checkNotifications();
            }
        })
        .catch(error => {
            console.error('Error marking all notifications as read:', error);
        });
    }
    
    // Load students
    function loadStudents() {
        // This would typically be an API call to get students
        // For now, we'll just use the appointments data to extract student info
        const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
        
        if (!studentList) {
            console.error("Student list container not found");
            return;
        }
        
        studentList.innerHTML = '';
        
        // Extract unique students from appointments
        const uniqueStudents = {};
        appointments.forEach(app => {
            if (app.studentId && !uniqueStudents[app.studentId]) {
                uniqueStudents[app.studentId] = {
                    id: app.studentId,
                    name: app.studentName || `Student ${app.studentId}`,
                    appointments: 1
                };
            } else if (app.studentId) {
                uniqueStudents[app.studentId].appointments += 1;
            }
        });
        
        const students = Object.values(uniqueStudents);
        
        if (students.length === 0) {
            studentList.innerHTML = '<tr><td colspan="4" class="empty-table">No students found</td></tr>';
            return;
        }
        
        // Sort by name
        students.sort((a, b) => a.name.localeCompare(b.name));
        
        students.forEach(student => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${student.id}</td>
                <td>${student.name}</td>
                <td>${student.appointments}</td>
                <td>
                    <button onclick="viewStudent(${student.id})" class="view-btn">View</button>
                </td>
            `;
            
            studentList.appendChild(row);
        });
    }
    
    // Format date helper function
    function formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    // Format time helper function
    function formatTime(timeStr) {
        if (!timeStr) return 'N/A';
        
        // Handle cases where timeStr is already in HH:MM format
        if (timeStr.includes(':')) {
            const [hours, minutes] = timeStr.split(':').map(Number);
            const period = hours >= 12 ? 'PM' : 'AM';
            const formattedHours = hours % 12 || 12;
            return `${formattedHours}:${minutes.toString().padStart(2, '0')} ${period}`;
        }
        
        // Handle cases where timeStr is a timestamp
        const date = new Date(timeStr);
        if (!isNaN(date.getTime())) {
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        return timeStr;
    }
    
    // Make these functions available to other scopes
    window.loadRecentAppointments = loadRecentAppointments;
    window.loadAllAppointments = loadAllAppointments;
    window.loadAdminNotifications = loadAdminNotifications;
    window.markAllAdminNotificationsAsRead = markAllAdminNotificationsAsRead;
    window.formatDate = formatDate;
    window.formatTime = formatTime;
    
    // Add these to initialize your admin dashboard
    fetchAdminNotifications();
    fetchAllAppointments();
    
    // Set interval to periodically check for new data
    setInterval(fetchAdminNotifications, 30000); // Check every 30 seconds
    setInterval(fetchAllAppointments, 30000); // Check every 30 seconds
});

// --- GLOBAL FUNCTIONS FOR ONCLICK HANDLERS ---

// Make viewAppointment available globally
window.viewAppointment = function(appointmentId) {
    const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
    const appointment = appointments.find(app => app.id === appointmentId);
    
    if (!appointment) {
        alert("Appointment not found");
        return;
    }
    
    // Mark as read
    appointment.read = true;
    
    // Update in localStorage
    const updatedAppointments = appointments.map(app => {
        if (app.id === appointmentId) {
            app.read = true;
        }
        return app;
    });
    localStorage.setItem('appointments', JSON.stringify(updatedAppointments));
    
    // Update notification count
    const notificationCount = document.getElementById('notification-count');
    if (notificationCount) {
        const unreadCount = updatedAppointments.filter(app => !app.read).length;
        notificationCount.textContent = unreadCount > 0 ? unreadCount : '';
        notificationCount.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }
    
    // Display in modal
    const modal = document.getElementById('appointment-modal');
    const modalContent = document.querySelector('.modal-content');
    
    if (!modal || !modalContent) {
        console.error("Modal elements not found");
        return;
    }
    
    modalContent.innerHTML = `
        <span class="close-modal">&times;</span>
        <h2>Appointment Details</h2>
        <div class="appointment-details">
            <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">${formatDate(appointment.date)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Time:</span>
                <span class="detail-value">${formatTime(appointment.time)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Student ID:</span>
                <span class="detail-value">${appointment.studentId}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Student Name:</span>
                <span class="detail-value">${appointment.studentName || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Type:</span>
                <span class="detail-value">${appointment.type}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value status-${appointment.status}">${appointment.status}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Reason:</span>
                <span class="detail-value">${appointment.reason || 'Not provided'}</span>
            </div>
        </div>
        <div class="modal-actions">
            ${appointment.status === 'pending' ? `
            <button onclick="approveAppointment(${appointment.id})" class="approve-btn">Approve</button>
            <button onclick="rejectAppointment(${appointment.id})" class="reject-btn">Reject</button>
            ` : ''}
            <button onclick="document.getElementById('appointment-modal').style.display='none'" class="close-btn">Close</button>
        </div>
    `;
    
    modal.style.display = 'block';
    
    // Re-attach close event
    const closeModalBtn = document.querySelector('.close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
};

// Functions for appointment status updates
window.approveAppointment = function(appointmentId) {
    updateAppointmentStatus(appointmentId, "approved");
};

window.rejectAppointment = function(appointmentId) {
    updateAppointmentStatus(appointmentId, "rejected");
};

function updateAppointmentStatus(appointmentId, status) {
    fetch(`/api/admin/appointments/${appointmentId}/status`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: status })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update the appointment in localStorage
            const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
            const updatedAppointments = appointments.map(app => {
                if (app.id === appointmentId) {
                    app.status = status;
                }
                return app;
            });
            localStorage.setItem('appointments', JSON.stringify(updatedAppointments));
            
            // Refresh the appointments display
            if (typeof loadRecentAppointments === 'function') {
                loadRecentAppointments();
            }
            
            if (typeof loadAllAppointments === 'function') {
                const statusFilter = document.getElementById('status-filter');
                if (statusFilter) {
                    loadAllAppointments(statusFilter.value);
                }
            }
            
            // Hide the modal if it's open
            const modal = document.getElementById('appointment-modal');
            if (modal) {
                modal.style.display = 'none';
            }
            
            // Show success feedback
            alert(`Appointment ${status} successfully.`);
        } else {
            alert("Failed to update appointment status. Please try again.");
        }
    })
    .catch(error => {
        console.error('Error updating appointment status:', error);
        alert("An error occurred while updating the appointment status.");
    });
}

// Other global functions
window.viewStudent = function(studentId) {
    console.log("Viewing student:", studentId);
    alert("Student details would be shown here.");
};

window.viewRelatedAppointment = function(appointmentId, event) {
    if (event) {
        event.stopPropagation();
    }
    viewAppointment(appointmentId);
};

window.markAdminNotificationAsRead = function(notificationId) {
    // Update UI first
    const notificationItem = document.querySelector(`.notification-item[onclick*="${notificationId}"]`);
    if (notificationItem) {
        notificationItem.classList.remove('unread');
        notificationItem.classList.add('read');
    }
    
    // Update in database
    fetch('/api/admin/notifications/mark-read', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            notification_ids: [notificationId]
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update local storage
            const adminNotifications = JSON.parse(localStorage.getItem('adminNotifications')) || [];
            const updatedNotifications = adminNotifications.map(notification => {
                if (notification.notification_id === notificationId) {
                    notification.read_status = true;
                }
                return notification;
            });
            localStorage.setItem('adminNotifications', JSON.stringify(updatedNotifications));
            
            // Update notification count
            const notificationCount = document.getElementById('notification-count');
            if (notificationCount) {
                const adminNotifications = JSON.parse(localStorage.getItem('adminNotifications')) || [];
                const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
                
                const unreadAppointments = appointments.filter(app => !app.read).length;
                const unreadNotifications = adminNotifications.filter(note => !note.read_status).length;
                const totalUnread = unreadAppointments + unreadNotifications;
                
                notificationCount.textContent = totalUnread;
                notificationCount.style.display = totalUnread > 0 ? 'inline-block' : 'none';
            }
        }
    })
    .catch(error => {
        console.error('Error marking notification as read:', error);
    });
};
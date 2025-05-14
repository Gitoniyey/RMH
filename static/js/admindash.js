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
        const unreadNotifications = adminNotifications.filter(note => !note.read).length;
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
        const sorted = [...adminNotifications].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        container.innerHTML = sorted.map((notification) => `
            <div class="notification-item ${notification.read ? '' : 'unread'}" 
                 onclick="markAdminNotificationAsRead(${notification.id})">
                <div class="notification-header">
                    <span class="notification-type">${notification.type ? notification.type.replace(/_/g, ' ') : 'notification'}</span>
                    <span class="notification-time">${formatDate(notification.timestamp)}</span>
                </div>
                <p>${notification.message}</p>
                ${notification.appointmentId ? `
                    <button class="view-related-btn" onclick="viewRelatedAppointment(${notification.appointmentId}, event)">
                        View Related Appointment
                    </button>` : ''}
            </div>
        `).join('');
    }
    
    // Mark all admin notifications as read
    function markAllAdminNotificationsAsRead() {
        const adminNotifications = JSON.parse(localStorage.getItem('adminNotifications')) || [];
        
        const updated = adminNotifications.map(notification => ({
            ...notification,
            read: true
        }));
        
        localStorage.setItem('adminNotifications', JSON.stringify(updated));
        checkNotifications();
    }
    
    // Load students list
    function loadStudents() {
        const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
        
        if (!studentList) {
            console.error("Student list container not found");
            return;
        }
        
        studentList.innerHTML = '';
        
        console.log("Loading students from appointments:", appointments);
        
        // Get unique students
        const studentMap = {};
        appointments.forEach(app => {
            if (app.studentId && app.studentName) {
                if (!studentMap[app.studentId]) {
                    studentMap[app.studentId] = {
                        id: app.studentId,
                        name: app.studentName,
                        count: 0,
                        pending: 0,
                        approved: 0,
                        rejected: 0
                    };
                }
                studentMap[app.studentId].count++;
                
                // Track status counts
                if (app.status === 'pending') studentMap[app.studentId].pending++;
                else if (app.status === 'approved') studentMap[app.studentId].approved++;
                else if (app.status === 'rejected') studentMap[app.studentId].rejected++;
            }
        });
        
        const students = Object.values(studentMap);
        
        console.log("Extracted students:", students);
        
        if (students.length === 0) {
            studentList.innerHTML = '<tr><td colspan="4" class="empty-table">No students found</td></tr>';
            return;
        }
        
        // Sort by name
        students.sort((a, b) => a.name.localeCompare(b.name));
        
        students.forEach(student => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${student.id || 'Unknown ID'}</td>
                <td>${student.name || 'Unknown Name'}</td>
                <td>
                    <span title="Pending: ${student.pending}, Approved: ${student.approved}, Rejected: ${student.rejected}">
                        ${student.count} 
                        ${student.pending > 0 ? `<span class="status-badge pending">${student.pending}</span>` : ''}
                    </span>
                </td>
                <td>
                    <button onclick="viewStudentAppointments('${student.id}')" class="view-btn">View Appointments</button>
                </td>
            `;
            studentList.appendChild(row);
        });
    }
    
    // Format date
    function formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            console.error("Error formatting date:", e);
            return dateStr;
        }
    }
    
    // Format time
    function formatTime(timeStr) {
        if (!timeStr) return 'N/A';
        
        try {
            const [hours, minutes] = timeStr.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const formattedHour = hour % 12 || 12;
            
            return `${formattedHour}:${minutes || '00'} ${ampm}`;
        } catch (e) {
            console.error("Error formatting time:", e);
            return timeStr;
        }
    }
    
    // Initial load
    checkNotifications();
    loadRecentAppointments();
    updateDashboardStats();
    setInterval(checkNotifications, 5000);
    
    // Make functions accessible globally
    window.formatDate = formatDate;
    window.formatTime = formatTime;
    window.checkNotifications = checkNotifications;
    window.loadRecentAppointments = loadRecentAppointments;
    window.loadAllAppointments = loadAllAppointments;
    window.updateDashboardStats = updateDashboardStats;
    window.loadStudents = loadStudents;
    
    // Debug function to inspect localStorage
    window.debugLocalStorage = function() {
        const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
        const adminNotifications = JSON.parse(localStorage.getItem('adminNotifications')) || [];
        const studentNotifications = JSON.parse(localStorage.getItem('studentNotifications')) || [];
        
        console.log("Appointments:", appointments);
        console.log("Admin Notifications:", adminNotifications);
        console.log("Student Notifications:", studentNotifications);
        
        return {
            appointments,
            adminNotifications,
            studentNotifications
        };
    };
    
    // Add global functions for HTML onclick handlers
    window.markAdminNotificationAsRead = function(id) {
        const adminNotifications = JSON.parse(localStorage.getItem('adminNotifications')) || [];
        
        const updated = adminNotifications.map(notification => {
            if (notification.id === id) {
                return { ...notification, read: true };
            }
            return notification;
        });
        
        localStorage.setItem('adminNotifications', JSON.stringify(updated));
        loadAdminNotifications();
        checkNotifications();
    };
    
    window.viewRelatedAppointment = function(appointmentId, event) {
        if (event) event.stopPropagation(); // Prevent notification click event
        viewAppointment(appointmentId);
    };
    
    window.viewAppointment = function(id) {
        const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
        const app = appointments.find(a => a.id === id);
        
        if (!app) {
            alert('Appointment not found');
            return;
        }
        
        // Mark as read
        markAsRead(id);
        
        // Fill modal
        document.getElementById('modal-student-name').textContent = app.studentName || 'N/A';
        document.getElementById('modal-student-id').textContent = app.studentId || 'N/A';
        document.getElementById('modal-date').textContent = formatDate(app.date);
        document.getElementById('modal-time').textContent = formatTime(app.time);
        document.getElementById('modal-type').textContent = app.type || 'N/A';
        document.getElementById('modal-symptoms').textContent = app.symptoms || '';
        document.getElementById('modal-status').textContent = app.status || 'pending';
        
        // Add action buttons if pending
        const actionsDiv = document.getElementById('modal-actions');
        actionsDiv.innerHTML = '';
        
        if (app.status === 'pending') {
            actionsDiv.innerHTML = `
                <button onclick="approveAppointment(${app.id})" class="approve-btn">Approve</button>
                <button onclick="rejectAppointment(${app.id})" class="reject-btn">Reject</button>
            `;
        }
        
        // Show modal
        document.getElementById('appointment-modal').style.display = 'block';
    };
    
    window.viewStudentAppointments = function(studentId) {
        const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
        const studentApps = appointments.filter(app => app.studentId === studentId);
        
        if (studentApps.length === 0) {
            alert('No appointments found for this student');
            return;
        }
        
        // Switch to appointments section and filter by this student
        document.querySelector('a[href="#appointments"]').click();
        
        // Custom filtering (not by status, but by student)
        const allAppointments = document.getElementById('all-appointments');
        allAppointments.innerHTML = '';
        
        // Sort by date (newest first)
        const sorted = [...studentApps].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        
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
    };
    
    window.markAsRead = function(id) {
        const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
        
        const updated = appointments.map(app => {
            if (app.id === id) {
                return { ...app, read: true };
            }
            return app;
        });
        
        localStorage.setItem('appointments', JSON.stringify(updated));
        refreshAppointments();
    };
    
    window.approveAppointment = function(id) {
        const reason = prompt('Add any notes for the approval (optional):');
        updateStatus(id, 'approved', reason || '');
    };
    
    window.rejectAppointment = function(id) {
        const reason = prompt('Please provide a reason for rejecting:');
        if (reason) {
            updateStatus(id, 'rejected', reason);
        }
    };
    
    window.updateStatus = function(id, status, reason = '') {
        const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
        const app = appointments.find(a => a.id === id);
        
        if (!app) {
            alert('Appointment not found');
            return;
        }
        
        // Update status
        const updated = appointments.map(a => {
            if (a.id === id) {
                return { ...a, status, reason, read: true };
            }
            return a;
        });
        
        localStorage.setItem('appointments', JSON.stringify(updated));
        
        // Send notification to student
        const studentNotifications = JSON.parse(localStorage.getItem('studentNotifications')) || [];
        
        const notification = {
            id: Date.now(),
            type: `appointment_${status}`,
            appointmentId: id,
            studentId: app.studentId,
            studentName: app.studentName,
            message: `Your appointment on ${formatDate(app.date)} at ${formatTime(app.time)} has been ${status}.${reason ? ` Reason: ${reason}` : ''}`,
            timestamp: new Date().toISOString(),
            read: false
        };
        
        studentNotifications.push(notification);
        localStorage.setItem('studentNotifications', JSON.stringify(studentNotifications));
        
        // Refresh appointments
        refreshAppointments();
        
        // Close modal if open
        document.getElementById('appointment-modal').style.display = 'none';
        
        alert(`Appointment has been ${status}`);
    };
    
    window.refreshAppointments = function() {
        // Refresh all appointment views
        loadRecentAppointments();
        loadAllAppointments(document.getElementById('status-filter').value);
        updateDashboardStats();
        checkNotifications();
    };
});
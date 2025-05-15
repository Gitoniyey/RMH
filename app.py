from flask import Flask, render_template, request, redirect, url_for, jsonify, session, flash
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

print("Supabase URL:", SUPABASE_URL)
print("Supabase Key:", SUPABASE_KEY)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev')  

@app.route('/')
def home():
    return render_template('universityclinic.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        student_id = request.form.get('studentId', type=int)


        # **This is the crucial line**:
        session['student_id'] = student_id
        return redirect(url_for('studentdash'))

    return render_template('login.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

@app.route('/studentdash')
def studentdash():
    return render_template('studentdash.html')

@app.route("/api/appointments", methods=["GET"])
def get_appointments():
    student_id = session.get("student_id")
    
    # Get all appointments for the student
    response = supabase.table("appointments").select("*").eq("student_id", student_id).execute()
    
    return jsonify(response.data)

@app.route("/api/appointments", methods=["POST"])
def create_appointment():
    student_id = session.get("student_id")
    
    data = request.json
    appointment_date = data.get("appointment_date")
    appointment_time = data.get("appointment_time")
    appointment_type = data.get("appointment_type")
    symptoms_reason = data.get("symptoms_reason")
    
    # Create new appointment
    new_appointment = {
        "student_id": student_id,
        "appointment_date": appointment_date,
        "appointment_time": appointment_time,
        "appointment_type": appointment_type,
        "symptoms_reason": symptoms_reason,
        "status": "pending"
    }
    
    response = supabase.table("appointments").insert(new_appointment).execute()
    
    if response.data:
        # Create notification for new appointment
        notification = {
            "student_id": student_id,
            "message": f"You have booked a new {appointment_type} appointment on {appointment_date} at {appointment_time}.",
            "type": "new_appointment",
            "related_appointment_id": response.data[0]["appointment_id"]
        }
        
        supabase.table("notifications").insert(notification).execute()
        
        return jsonify({"success": True, "appointment": response.data[0]})
    
    return jsonify({"success": False, "error": "Failed to create appointment"}), 500

@app.route("/api/appointments/<appointment_id>", methods=["DELETE"])
def delete_appointment(appointment_id):
    student_id = session.get("student_id")
    
    # Verify appointment belongs to student
    response = supabase.table("appointments").select("*").eq("appointment_id", appointment_id).eq("student_id", student_id).execute()
    
    if not response.data:
        return jsonify({"success": False, "error": "Appointment not found or unauthorized"}), 404
    
    # Delete appointment
    supabase.table("appointments").delete().eq("appointment_id", appointment_id).execute()
    
    # Create notification for deleted appointment
    notification = {
        "student_id": student_id,
        "message": "An appointment has been cancelled.",
        "type": "cancelled_appointment"
    }
    
    supabase.table("notifications").insert(notification).execute()
    
    return jsonify({"success": True})

@app.route("/api/notifications", methods=["GET"])
def get_notifications():
    student_id = session.get("student_id")
    
    # Get all notifications for the student
    response = supabase.table("notifications").select("*").eq("student_id", student_id).execute()
    
    return jsonify(response.data)

@app.route("/api/notifications/mark-read", methods=["POST"])
def mark_notifications_read():
    student_id = session.get("student_id")
    notification_ids = request.json.get("notification_ids", [])
    
    if notification_ids:
        # Mark specific notifications as read
        response = supabase.table("notifications").update({"read_status": True}).in_("notification_id", notification_ids).eq("student_id", student_id).execute()
    else:
        # Mark all notifications as read
        response = supabase.table("notifications").update({"read_status": True}).eq("student_id", student_id).execute()
    
    return jsonify({"success": True})

@app.route("/api/notifications/clear", methods=["DELETE"])
def clear_notifications():
    student_id = session.get("student_id")
    
    # Delete all notifications for the student
    supabase.table("notifications").delete().eq("student_id", student_id).execute()
    
    return jsonify({"success": True})



@app.route('/admindash')
def admindash():
    return render_template('admindash.html')

@app.route('/privacy')
def privacy():
    return render_template('privacy.html')

@app.route('/terms')
def terms():
    return render_template('terms.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        full_name = request.form.get('full_name')
        email = request.form.get('email')
        role = request.form.get('role')

        # Call Supabase to insert the user data
        response = insert_user(email, full_name, role)

        if response.error:
            return f"<h3>Error: {response.error.message}</h3>"

        # After successful registration, redirect to login page
        return redirect(url_for('login'))

    return render_template('register.html')

@app.route('/book', methods=['POST'])
def book_appointment():
    student_name = request.form.get('student_name')
    student_id = request.form.get('student_id')
    course = request.form.get('course')
    appointment_date = request.form.get('appointment_date')
    reason = request.form.get('reason')

    response = supabase.table("appointments").insert([{
        "student_name": student_name,
        "student_id": student_id,
        "course": course,
        "appointment_date": appointment_date,
        "reason": reason
    }]).execute()

    if response.error:
        return f"<h3>Error: {response.error.message}</h3>"

    return redirect(url_for('studentdash'))


# --- Supabase Query Functions ---
def insert_user(email, full_name, role):
    return supabase.table("users").insert([{
        "email": email,
        "full_name": full_name,
        "role": role
    }]).execute()

def get_all_users():
    return supabase.table("users").select("*").execute()

def get_users_by_role(role):
    return supabase.table("users").select("*").eq("role", role).execute()

def update_user_name(email, new_name):
    return supabase.table("users").update({"full_name": new_name}).eq("email", email).execute()

def delete_user_by_email(email):
    return supabase.table("users").delete().eq("email", email).execute()

if __name__ == '__main__':
    app.run(debug=True)

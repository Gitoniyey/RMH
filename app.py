from flask import Flask, render_template, request, redirect, url_for
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

@app.route('/')
def home():
    return render_template('universityclinic.html')

@app.route('/login')
def login():
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

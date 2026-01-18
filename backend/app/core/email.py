from fastapi import BackgroundTasks
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
from typing import List
from app.core.config import settings
import os

# Ensure user adds these to .env later
# For now, default to console print or dummy logic if keys missing

class EmailService:
    def __init__(self):
        self.conf = ConnectionConfig(
            MAIL_USERNAME = os.getenv("MAIL_USERNAME", "user@example.com"),
            MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "password"),
            MAIL_FROM = os.getenv("MAIL_FROM", "admin@homie-app.com"),
            MAIL_PORT = int(os.getenv("MAIL_PORT", 587)),
            MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com"),
            MAIL_STARTTLS = True,
            MAIL_SSL_TLS = False,
            USE_CREDENTIALS = True,
            VALIDATE_CERTS = True
        )
        self.fm = FastMail(self.conf)

    async def send_email(self, email: EmailStr, subject: str, body: str):
        """
        Send an email via SMTP.
        If credentials are dummy, this might fail or we can mock it.
        For safety now: Try except and print to console if fail.
        """
        message = MessageSchema(
            subject=subject,
            recipients=[email],
            body=body,
            subtype=MessageType.html
        )

        try:
            # Check if using dummy values
            if "example.com" in self.conf.MAIL_USERNAME:
                 print(f"📧 [MOCK EMAIL] To: {email} | Subject: {subject} | Body: {body}")
                 return

            await self.fm.send_message(message)
            print(f"📧 Sent email to {email}")
        except Exception as e:
            print(f"❌ Email failed: {e}")
            print(f"📧 [FALLBACK] To: {email} | Subject: {subject} | Body: {body}")

email_service = EmailService()

async def send_welcome_email(email: EmailStr, name: str):
    subject = "Welcome to Home & Friends! 🏠"
    body = f"""
    <h1>Welcome, {name}!</h1>
    <p>We are thrilled to have you join the smartest home management platform.</p>
    <p>Start by creating a group or joining one!</p>
    <br>
    <p>Cheers,<br>Homie Team</p>
    """
    await email_service.send_email(email, subject, body)

async def send_bill_reminder(email: EmailStr, name: str, bill_desc: str, amount: float, due_date: str):
    subject = f"💸 Bill Reminder: {bill_desc}"
    body = f"""
    <h3>Hi {name},</h3>
    <p>Just a friendly reminder that the following bill is due soon:</p>
    <ul>
        <li><strong>Bill:</strong> {bill_desc}</li>
        <li><strong>Amount:</strong> ${amount}</li>
        <li><strong>Due Date:</strong> {due_date}</li>
    </ul>
    <p>Don't forget to mark it as paid via the Dashboard!</p>
    """
    await email_service.send_email(email, subject, body)

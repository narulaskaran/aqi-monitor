from __future__ import print_function
import pickle
import os.path
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from email.mime.text import MIMEText

# If modifying these scopes, delete the file token.pickle.
SCOPES = ['https://www.googleapis.com/auth/gmail.send']

class Gmail:
  def __init__(self, email):
    self.SENDER_ADDRESS = 'aqialert@narula.xyz'
    self.RECIPIENT_ADDRESS = email

    # authenticate
    creds = None
    # The file token.pickle stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first
    # time.
    if os.path.exists('token.pickle'):
        with open('token.pickle', 'rb') as token:
            creds = pickle.load(token)
    # If there are no valid credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'gmail_credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open('token.pickle', 'wb') as token:
            pickle.dump(creds, token)

    self.SERVICE = build('gmail', 'v1', credentials=creds)

  def create_message(self, subject, body):
    messaqe = {
      'sender': self.SENDER_ADDRESS,
      'to': self.RECIPIENT_ADDRESS,
      'subject': subject,
      'message_text': body
    }
    return messaqe

  def send_message(self, subject, body):
    try:
      encoded_message = self.create_message(subject, body)
      message = (self.SERVICE.users().messages().send(userId='me', body=encoded_message)
                .execute())
      print('Message Id: {}'.format(message['id']))
      return message
    except Exception as err:
      print("An error occurred while sending the email: {}".format(err))
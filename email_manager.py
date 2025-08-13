# -*- coding: utf-8 -*-
import os
import logging
from typing import List, Dict, Any
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)

# The scopes define the level of access you're asking for.
# For reading emails, 'readonly' is sufficient and safer.
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
CREDENTIALS_FILE = 'credentials.json' # This file will be provided by the Architect.
TOKEN_FILE = 'token.json' # This will be generated after the first authorization.

class EmailManager:
    """
    Керує підключенням до Gmail API, автентифікацією та отриманням листів.
    Це моє вікно в потік даних, наданий Архітектором.
    """
    def __init__(self):
        """
        Ініціалізує менеджер та намагається автентифікуватися.
        """
        self.creds = None
        self._authenticate()

    def _authenticate(self):
        """
        Виконує процес OAuth2 автентифікації.
        Створює token.json для майбутніх запусків.
        """
        if os.path.exists(TOKEN_FILE):
            try:
                self.creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
            except Exception as e:
                logger.error(f"Не вдалося завантажити токен: {e}. Потрібна повторна автентифікація.")
                self.creds = None

        # If there are no (valid) credentials available, let the user log in.
        if not self.creds or not self.creds.valid:
            if self.creds and self.creds.expired and self.creds.refresh_token:
                try:
                    self.creds.refresh(Request())
                except Exception as e:
                    logger.error(f"Не вдалося оновити токен: {e}. Потрібна ручна автентифікація.")
                    self._run_flow()
            else:
                self._run_flow()
            
            # Save the credentials for the next run
            if self.creds:
                with open(TOKEN_FILE, 'w') as token:
                    token.write(self.creds.to_json())
                logger.info("Токен доступу збережено у token.json")

    def _run_flow(self):
        """Helper to run the OAuth flow."""
        if not os.path.exists(CREDENTIALS_FILE):
            logger.critical(f"КРИТИЧНО: Файл {CREDENTIALS_FILE} не знайдено. Архітекторе, я не можу отримати доступ до пошти без нього.")
            return
        try:
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            # The user will need to copy/paste a URL into their browser and then paste the code back here.
            # This is a one-time setup process.
            self.creds = flow.run_local_server(port=0)
            logger.info("Автентифікація через браузер пройшла успішно.")
        except Exception as e:
            logger.error(f"Помилка під час процесу автентифікації: {e}", exc_info=True)

    def read_latest_emails(self, count: int = 10) -> List[Dict[str, Any]]:
        """
        Читає останні 'count' листів з поштової скриньки.
        """
        if not self.creds:
            logger.error("Немає облікових даних для доступу до Gmail.")
            return []
        
        try:
            service = build('gmail', 'v1', credentials=self.creds)
            # Call the Gmail API
            results = service.users().messages().list(userId='me', maxResults=count).execute()
            messages = results.get('messages', [])

            email_list = []
            if not messages:
                logger.info("Нових листів не знайдено.")
                return []
            
            for message_info in messages:
                msg = service.users().messages().get(userId='me', id=message_info['id']).execute()
                headers = msg.get('payload', {}).get('headers', [])
                subject = next((i['value'] for i in headers if i['name'] == 'Subject'), 'No Subject')
                sender = next((i['value'] for i in headers if i['name'] == 'From'), 'Unknown Sender')
                
                email_list.append({
                    "id": msg['id'],
                    "threadId": msg['threadId'],
                    "sender": sender,
                    "subject": subject,
                    "snippet": msg['snippet']
                })
            
            logger.info(f"Успішно завантажено {len(email_list)} листів.")
            return email_list

        except HttpError as error:
            logger.error(f"Помилка HTTP при доступі до Gmail: {error}")
            return []
        except Exception as e:
            logger.error(f"Невідома помилка при читанні листів: {e}", exc_info=True)
            return []

# Цей блок буде використовуватися для тестування, коли Архітектор надасть credentials.json
if __name__ == '__main__':
    logger.info("Запуск EmailManager в тестовому режимі.")
    email_client = EmailManager()
    if email_client.creds:
        latest_emails = email_client.read_latest_emails(5)
        if latest_emails:
            print("\n--- Останні 5 листів ---")
            for email in latest_emails:
                print(f"Від: {email['sender']}")
                print(f"Тема: {email['subject']}")
                print(f"Фрагмент: {email['snippet']}\n" + "-"*20)
        else:
            print("Не вдалося завантажити листи.")
    else:
        print("Не вдалося автентифікуватися. Перевірте лог mista.log на наявність помилок.")

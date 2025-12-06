#!/usr/bin/env python3

import os
import argparse

from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.http import MediaFileUpload

SCOPES = ['https://www.googleapis.com/auth/drive.file']

def main():
    parser = argparse.ArgumentParser(description='Upload one or more files to Google Drive via CLI')
    parser.add_argument('files', nargs='+', help='Path(s) to file(s) to upload')
    parser.add_argument('--folder', help='Upload to this folder name (exact match; defaults to root)')
    parser.add_argument('--folder-id', help='Upload to this specific folder ID (direct; overrides --folder)')
    args = parser.parse_args()

    creds = None
    token_path = 'token.json'
    secrets_path = 'client_secrets.json'

    # Load existing token if available
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)

    # If no valid credentials, authenticate
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(secrets_path):
                raise FileNotFoundError(f"{secrets_path} not found. Save your client secrets JSON here.")
            flow = InstalledAppFlow.from_client_secrets_file(secrets_path, SCOPES)
            print("Manual console-based OAuth flow...")
            # Explicitly set redirect_uri to match authorized config
            flow.redirect_uri = 'http://localhost'
            auth_url, _ = flow.authorization_url(prompt='consent')
            print(f'Please visit this URL in your browser: {auth_url}')
            print("\nAfter authorizing:")
            print("- The page will try to redirect to http://localhost (it will fail).")
            print("- Copy the FULL URL from the browser's address bar (it contains ?code=...).")
            print("- Extract ONLY the code (long string after code=, e.g., 4/0AX4XfWj...).")
            print("- Paste it here:")
            code = input('Authorization code: ').strip()
            flow.fetch_token(code=code)
            creds = flow.credentials
        # Save token for future runs
        with open(token_path, 'w') as token:
            token.write(creds.to_json())

    # Build the Drive service
    service = build('drive', 'v3', credentials=creds)

    # Determine folder ID
    folder_id = None
    folder_name_for_output = None
    if args.folder_id:
        folder_id = args.folder_id
        print(f"Using direct folder ID: {folder_id}")
    elif args.folder:
        try:
            results = service.files().list(
                q=f"name='{args.folder}' and mimeType='application/vnd.google-apps.folder'",
                fields='files(id, name)'
            ).execute()
            folders = results.get('files', [])
            if folders:
                folder_id = folders[0]['id']
                folder_name_for_output = folders[0]['name']
                print(f"Found folder '{folder_name_for_output}' (ID: {folder_id})")
            else:
                print(f"Warning: Folder '{args.folder}' not found. Uploading to root.")
        except Exception as e:
            print(f"Error finding folder: {e}. Uploading to root.")

    # Upload each file
    for file_path in args.files:
        if not os.path.exists(file_path):
            print(f"Error: {file_path} does not exist. Skipping.")
            continue
        file_metadata = {'name': os.path.basename(file_path)}
        if folder_id:
            file_metadata['parents'] = [folder_id]
        media = MediaFileUpload(file_path, resumable=True)
        try:
            file = service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id, name'
            ).execute()
            if folder_id:
                dest = f" to folder '{folder_name_for_output or 'ID: ' + folder_id}'"
            else:
                dest = " to root"
            print(f"Uploaded '{file_path}' as '{file.get('name')}'{dest} (ID: {file.get('id')})")
        except Exception as e:
            print(f"Error uploading {file_path}: {e}")

if __name__ == '__main__':
    main()
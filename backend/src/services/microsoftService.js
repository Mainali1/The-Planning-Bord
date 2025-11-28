const { Client } = require('@microsoft/microsoft-graph-client');
const { AuthProvider } = require('@azure/msal-node');

class MicrosoftService {
  constructor() {
    this.client = null;
    this.initializeClient();
  }

  initializeClient() {
    const config = {
      auth: {
        clientId: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}`
      }
    };

    const cca = new AuthProvider(config);
    
    this.client = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          const result = await cca.acquireTokenByClientCredential({
            scopes: ['https://graph.microsoft.com/.default']
          });
          return result.accessToken;
        }
      }
    });
  }

  async sendEmail(to, subject, body, importance = 'normal') {
    try {
      const message = {
        subject: subject,
        importance: importance,
        body: {
          contentType: 'HTML',
          content: body
        },
        toRecipients: [
          {
            emailAddress: {
              address: to
            }
          }
        ]
      };

      await this.client.api('/users/' + process.env.MICROSOFT_USER_ID + '/sendMail')
        .post({ message });
      
      return { success: true, message: 'Email sent successfully' };
    } catch (error) {
      console.error('Error sending email via Microsoft Graph:', error);
      throw new Error('Failed to send email via Microsoft 365');
    }
  }

  async createCalendarEvent(subject, start, end, attendees = [], body = '') {
    try {
      const event = {
        subject: subject,
        start: {
          dateTime: start,
          timeZone: 'UTC'
        },
        end: {
          dateTime: end,
          timeZone: 'UTC'
        },
        attendees: attendees.map(email => ({
          emailAddress: { address: email },
          type: 'required'
        })),
        body: {
          contentType: 'HTML',
          content: body
        }
      };

      const createdEvent = await this.client
        .api('/users/' + process.env.MICROSOFT_USER_ID + '/events')
        .post(event);
      
      return createdEvent;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw new Error('Failed to create calendar event');
    }
  }

  async uploadFileToOneDrive(fileName, fileContent, folderPath = '/BusinessApp') {
    try {
      const uploadPath = `/users/${process.env.MICROSOFT_USER_ID}/drive/root:${folderPath}/${fileName}:/content`;
      
      const uploadSession = await this.client
        .api(uploadPath)
        .put(fileContent);
      
      return uploadSession;
    } catch (error) {
      console.error('Error uploading file to OneDrive:', error);
      throw new Error('Failed to upload file to OneDrive');
    }
  }

  async getFilesFromOneDrive(folderPath = '/BusinessApp') {
    try {
      const files = await this.client
        .api(`/users/${process.env.MICROSOFT_USER_ID}/drive/root:${folderPath}:/children`)
        .get();
      
      return files.value;
    } catch (error) {
      console.error('Error getting files from OneDrive:', error);
      throw new Error('Failed to get files from OneDrive');
    }
  }

  async createSharePointListItem(listName, itemData) {
    try {
      const listItem = {
        fields: itemData
      };

      const createdItem = await this.client
        .api(`/sites/${process.env.SHAREPOINT_SITE_ID}/lists/${listName}/items`)
        .post(listItem);
      
      return createdItem;
    } catch (error) {
      console.error('Error creating SharePoint list item:', error);
      throw new Error('Failed to create SharePoint list item');
    }
  }

  async getTeamsChannelMessages(teamId, channelId, limit = 20) {
    try {
      const messages = await this.client
        .api(`/teams/${teamId}/channels/${channelId}/messages`)
        .top(limit)
        .get();
      
      return messages.value;
    } catch (error) {
      console.error('Error getting Teams messages:', error);
      throw new Error('Failed to get Teams channel messages');
    }
  }

  async sendTeamsMessage(teamId, channelId, messageContent) {
    try {
      const message = {
        body: {
          content: messageContent
        }
      };

      const sentMessage = await this.client
        .api(`/teams/${teamId}/channels/${channelId}/messages`)
        .post(message);
      
      return sentMessage;
    } catch (error) {
      console.error('Error sending Teams message:', error);
      throw new Error('Failed to send Teams message');
    }
  }
}

module.exports = new MicrosoftService();
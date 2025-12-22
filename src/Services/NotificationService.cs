using System;
using System.Collections.Generic;
using System.Timers;

namespace ThePlanningBord.Services
{
    public class NotificationService : IDisposable
    {
        public event Action? OnChange;
        public List<NotificationMessage> Messages { get; private set; } = new List<NotificationMessage>();

        public void ShowSuccess(string message, string title = "Success") => Show(NotificationType.Success, message, title);
        public void ShowError(string message, string title = "Error") => Show(NotificationType.Error, message, title);
        public void ShowWarning(string message, string title = "Warning") => Show(NotificationType.Warning, message, title);
        public void ShowInfo(string message, string title = "Info") => Show(NotificationType.Info, message, title);

        private void Show(NotificationType type, string message, string title)
        {
            var notification = new NotificationMessage
            {
                Id = Guid.NewGuid(),
                Type = type,
                Title = title,
                Message = message,
                CreatedAt = DateTime.Now
            };

            Messages.Add(notification);
            NotifyStateChanged();
            
            // Auto remove after 5 seconds
            var timer = new System.Timers.Timer(5000);
            timer.Elapsed += (sender, args) => Remove(notification);
            timer.AutoReset = false;
            timer.Enabled = true;
        }

        public void Remove(NotificationMessage message)
        {
            if (Messages.Contains(message))
            {
                Messages.Remove(message);
                NotifyStateChanged();
            }
        }

        private void NotifyStateChanged() => OnChange?.Invoke();

        public void Dispose()
        {
            // Cleanup logic if needed
        }
    }

    public class NotificationMessage
    {
        public Guid Id { get; set; }
        public NotificationType Type { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public enum NotificationType
    {
        Info,
        Success,
        Warning,
        Error
    }
}

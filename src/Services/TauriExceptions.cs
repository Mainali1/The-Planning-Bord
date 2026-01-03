namespace ThePlanningBord.Services
{
    public class TauriException : Exception
    {
        public TauriException(string message) : base(message) { }
        public TauriException(string message, Exception innerException) : base(message, innerException) { }
    }

    public class TauriNetworkException : TauriException
    {
        public TauriNetworkException(string message) : base(message) { }
        public TauriNetworkException(string message, Exception innerException) : base(message, innerException) { }
    }

    public class TauriValidationException : TauriException
    {
        public TauriValidationException(string message) : base(message) { }
        public TauriValidationException(string message, Exception innerException) : base(message, innerException) { }
    }
}

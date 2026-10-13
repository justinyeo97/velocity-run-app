export function AuthDivider({ children }) {
  return <div className="auth-method-divider"><span>{children}</span></div>
}

export function AuthTextField({ id, label, type, placeholder, autoComplete, value, onChange, required = false }) {
  return (
    <div className="auth-input-group">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className="auth-text-input"
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        required={required}
      />
    </div>
  )
}

export function GoogleSignInButton({ onClick, pending }) {
  return (
    <button className="auth-google-action" type="button" onClick={onClick} disabled={pending}>
      <span className="auth-google-g" aria-hidden="true">G</span>
      <span>{pending ? 'Connecting to Google...' : 'Continue with Google'}</span>
      <span className="auth-google-arrow" aria-hidden="true">↗</span>
    </button>
  )
}

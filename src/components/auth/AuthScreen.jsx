import { Link } from 'react-router-dom'

function LightningGraphic() {
  return (
    <svg className="auth-lightning-art" viewBox="0 0 360 430" role="img" aria-label="A stylized lightning bolt over running track lines">
      <circle className="auth-art-orbit" cx="180" cy="215" r="142" />
      <circle className="auth-art-orbit auth-art-orbit-inner" cx="180" cy="215" r="105" />
      <path className="auth-art-track" d="M18 295C78 264 112 253 180 253s102 11 162 42" />
      <path className="auth-art-track auth-art-track-secondary" d="M30 330c50-23 94-34 150-34s100 11 150 34" />
      <path className="auth-art-bolt-shadow" d="m205 61-91 164h59l-19 144 101-187h-64z" />
      <path className="auth-art-bolt" d="m198 66-82 150h59l-16 131 93-171h-62z" />
      <path className="auth-art-glint" d="m193 99-44 81h34l-7 55 48-89h-34z" />
    </svg>
  )
}

export default function AuthScreen({
  mode,
  eyebrow,
  title,
  description,
  storyTitle,
  storyDescription,
  switchPrompt,
  switchAction,
  switchTo,
  children,
}) {
  return (
    <main className={`auth-experience auth-experience-${mode}`}>
      <section className="auth-story" aria-label="Velocity Run Club">
        <Link className="auth-wordmark" to="/login" aria-label="Velocity Run Club">
          <span className="brand-mark" aria-hidden="true">{ '\u26A1' }</span>
          <span>VELOCITY<span>RUN CLUB</span></span>
        </Link>

        <div className="auth-story-content">
          <p className="auth-story-label"><span /> BUILT FOR THE NEXT MILE</p>
          <LightningGraphic />
          <h2>{storyTitle}</h2>
          <p className="auth-story-description">{storyDescription}</p>
        </div>

        <div className="auth-story-footer">
          <span>RUN TOGETHER</span>
          <span>PACE · PEOPLE · PROGRESS</span>
        </div>
      </section>

      <section className="auth-panel" aria-labelledby="auth-screen-title">
        <div className="auth-panel-topline">
          <span className="auth-panel-tag">MEMBER ACCESS</span>
        </div>

        <div className="auth-form-wrap">
          <header className="auth-form-heading">
            <p className="auth-form-eyebrow">{eyebrow}</p>
            <h1 id="auth-screen-title">{title}</h1>
            <p>{description}</p>
          </header>

          {children}

          <p className="auth-account-switch">
            {switchPrompt} <Link to={switchTo}>{switchAction}</Link>
          </p>
        </div>

        <footer className="auth-panel-footer">
          <span>VELOCITY RUN CLUB</span>
          <span>EVERY SECOND COUNTS</span>
        </footer>
      </section>
    </main>
  )
}

export default function FeedComposer({
  open,
  onToggle,
  onSubmit,
  title,
  setTitle,
  content,
  setContent,
  visibility,
  setVisibility,
  includeRun,
  setIncludeRun,
  runForm,
  setRunForm,
  posting,
  imageInputRef,
  imagePreviewUrl,
  imageFile,
  onImageChange,
  onRemoveImage,
}) {
  return (
    <section className="feed-composer-area" aria-label="Create a post">
      <div className="feed-compose-prompt">
        <span className="feed-compose-mark" aria-hidden="true">{ '\u26A1' }</span>
        <div className="feed-compose-copy">
          <strong>Share a moment from your run</strong>
          <span>Bring the crew along, one mile at a time.</span>
        </div>
        <button
          className="feed-create-button"
          type="button"
          aria-expanded={open}
          aria-controls="club-composer-form"
          onClick={onToggle}
        >
          <span aria-hidden="true">{open ? '\u2212' : '\u002B'}</span>
          {open ? 'Close form' : 'Create a post'}
        </button>
      </div>

      {open && (
        <form id="club-composer-form" className="club-composer card composer-flash-in" onSubmit={onSubmit}>
          <div className="composer-heading">
            <div>
              <span className="composer-overline">NEW CLUB UPDATE</span>
              <h2>Share an update</h2>
              <p>Tell the crew what you have been up to.</p>
            </div>
          </div>

          <label className="composer-field composer-labeled-field">
            <span>Title</span>
            <input
              className="form-control"
              placeholder="Title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="composer-field composer-labeled-field">
            <span>Your update</span>
            <textarea
              className="form-control"
              placeholder="What's on your mind?"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={3}
            />
          </label>

          <fieldset className="visibility-fieldset">
            <legend>Who can see this?</legend>
            <div className="visibility-options">
              <label className="visibility-choice">
                <input
                  className="form-check-input"
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={visibility === 'public'}
                  onChange={(event) => setVisibility(event.target.value)}
                />
                Public
              </label>
              <label className="visibility-choice">
                <input
                  className="form-check-input"
                  type="radio"
                  name="visibility"
                  value="friends"
                  checked={visibility === 'friends'}
                  onChange={(event) => setVisibility(event.target.value)}
                />
                Friends only
              </label>
            </div>
          </fieldset>

          <label className="add-run-toggle">
            <input
              type="checkbox"
              checked={includeRun}
              onChange={(event) => setIncludeRun(event.target.checked)}
              disabled={posting}
            />
            <span className="add-run-toggle-icon" aria-hidden="true">{ '\u26A1' }</span>
            <span className="add-run-toggle-copy">
              <strong>Add a run</strong>
              <small>Attach distance, time, and workout stats to this post</small>
            </span>
          </label>

          {includeRun && (
            <fieldset className="run-fields" disabled={posting}>
              <legend>Run details</legend>
              <label className="run-field run-field-wide">
                <span>Run title <small>Optional</small></span>
                <input
                  className="form-control"
                  type="text"
                  placeholder="Easy morning miles"
                  value={runForm.title}
                  onChange={(event) => setRunForm((current) => ({ ...current, title: event.target.value }))}
                />
              </label>
              <label className="run-field">
                <span>Started at</span>
                <input
                  className="form-control"
                  type="datetime-local"
                  value={runForm.startedAt}
                  onChange={(event) => setRunForm((current) => ({ ...current, startedAt: event.target.value }))}
                  required
                />
              </label>
              <label className="run-field">
                <span>Distance <small>km</small></span>
                <input
                  className="form-control"
                  type="number"
                  min="0.001"
                  step="0.001"
                  placeholder="5.00"
                  value={runForm.distanceKm}
                  onChange={(event) => setRunForm((current) => ({ ...current, distanceKm: event.target.value }))}
                  required
                />
              </label>
              <div className="run-field run-duration-field">
                <span>Elapsed time <small>hh : mm : ss</small></span>
                <div className="run-duration-inputs">
                  <input
                    className="form-control"
                    type="number"
                    min="0"
                    step="1"
                    aria-label="Duration hours"
                    placeholder="0"
                    value={runForm.hours}
                    onChange={(event) => setRunForm((current) => ({ ...current, hours: event.target.value }))}
                    required
                  />
                  <input
                    className="form-control"
                    type="number"
                    min="0"
                    max="59"
                    step="1"
                    aria-label="Duration minutes"
                    placeholder="00"
                    value={runForm.minutes}
                    onChange={(event) => setRunForm((current) => ({ ...current, minutes: event.target.value }))}
                    required
                  />
                  <input
                    className="form-control"
                    type="number"
                    min="0"
                    max="59"
                    step="1"
                    aria-label="Duration seconds"
                    placeholder="00"
                    value={runForm.seconds}
                    onChange={(event) => setRunForm((current) => ({ ...current, seconds: event.target.value }))}
                    required
                  />
                </div>
              </div>
              <label className="run-field">
                <span>Moving time <small>seconds · optional</small></span>
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Optional"
                  value={runForm.movingSeconds}
                  onChange={(event) => setRunForm((current) => ({ ...current, movingSeconds: event.target.value }))}
                />
              </label>
              <label className="run-field">
                <span>Elevation gain <small>meters · optional</small></span>
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Optional"
                  value={runForm.elevationGain}
                  onChange={(event) => setRunForm((current) => ({ ...current, elevationGain: event.target.value }))}
                />
              </label>
              <label className="run-field">
                <span>Average heart rate <small>bpm · optional</small></span>
                <input
                  className="form-control"
                  type="number"
                  min="1"
                  max="250"
                  step="1"
                  placeholder="Optional"
                  value={runForm.averageHeartRate}
                  onChange={(event) => setRunForm((current) => ({ ...current, averageHeartRate: event.target.value }))}
                />
              </label>
              <label className="run-field">
                <span>Maximum heart rate <small>bpm · optional</small></span>
                <input
                  className="form-control"
                  type="number"
                  min="1"
                  max="250"
                  step="1"
                  placeholder="Optional"
                  value={runForm.maxHeartRate}
                  onChange={(event) => setRunForm((current) => ({ ...current, maxHeartRate: event.target.value }))}
                />
              </label>
            </fieldset>
          )}

          <div className="post-image-field">
            <input
              ref={imageInputRef}
              id="post-image"
              className="post-image-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              aria-label="Attach an image to your post"
              onChange={onImageChange}
              disabled={posting}
            />
            <label className="post-image-button" htmlFor="post-image">
              <span aria-hidden="true">{ '\u{1F4F7}' }</span> Add image
            </label>
            <span className="post-image-hint">JPEG, PNG, WebP, or GIF · up to 8 MB</span>
          </div>
          {imagePreviewUrl && (
            <div className="post-image-preview">
              <img src={imagePreviewUrl} alt={`Preview of ${imageFile?.name || 'selected image'}`} />
              <button className="remove-image-button" type="button" onClick={onRemoveImage} disabled={posting}>
                Remove image
              </button>
            </div>
          )}
          <div className="composer-submit-row">
            <span>Fields marked optional can be left blank.</span>
            <button className="btn btn-primary club-post-button" type="submit" disabled={posting}>
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

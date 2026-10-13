import { useCallback, useEffect, useRef, useState } from 'react'
import { createPost } from '../../services/posts'
import { buildRunPayload, EMPTY_RUN_DRAFT, IMAGE_MAX_BYTES, IMAGE_MIME_TYPES } from './feedModel'

export function usePostComposer(apiFetch, onPublished) {
  const imageInputRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState('')
  const [includeRun, setIncludeRun] = useState(false)
  const [runForm, setRunForm] = useState(() => ({ ...EMPTY_RUN_DRAFT }))
  const [imageFile, setImageFile] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl('')
      return undefined
    }

    const preview = URL.createObjectURL(imageFile)
    setImagePreviewUrl(preview)
    return () => URL.revokeObjectURL(preview)
  }, [imageFile])

  const toggle = useCallback(() => setOpen((value) => !value), [])

  const selectImage = useCallback((event) => {
    const file = event.currentTarget.files?.[0]
    if (!file) return

    if (!IMAGE_MIME_TYPES.has(file.type)) {
      setError('Choose a JPEG, PNG, WebP, or GIF image.')
      setImageFile(null)
      event.currentTarget.value = ''
      return
    }
    if (file.size > IMAGE_MAX_BYTES) {
      setError('Choose an image smaller than 8 MB.')
      setImageFile(null)
      event.currentTarget.value = ''
      return
    }

    setError('')
    setImageFile(file)
  }, [])

  const removeImage = useCallback(() => {
    setImageFile(null)
    if (imageInputRef.current) imageInputRef.current.value = ''
  }, [])

  const submit = useCallback(async (event) => {
    event.preventDefault()
    setError('')
    if (!title.trim()) return setError('Add a title')
    if (!content.trim()) return setError('Write something first')
    if (!visibility) return setError('Choose Public or Friends only')

    let run
    if (includeRun) {
      const result = buildRunPayload(runForm)
      if (result.error) return setError(result.error)
      run = result.payload
    }

    setPosting(true)
    try {
      const form = new FormData()
      form.append('title', title.trim())
      form.append('content', content.trim())
      form.append('visibility', visibility)
      if (imageFile) form.append('image', imageFile)
      if (run) form.append('run', JSON.stringify(run))

      const created = await createPost(apiFetch, form)
      setTitle('')
      setContent('')
      setVisibility('')
      setIncludeRun(false)
      setRunForm({ ...EMPTY_RUN_DRAFT })
      removeImage()
      setOpen(false)
      await onPublished(created)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setPosting(false)
    }
  }, [apiFetch, content, imageFile, includeRun, onPublished, removeImage, runForm, title, visibility])

  return {
    open,
    toggle,
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
    imageInputRef,
    imageFile,
    imagePreviewUrl,
    posting,
    error,
    selectImage,
    removeImage,
    submit,
  }
}

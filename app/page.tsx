'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Fragment, useRef, useState } from 'react'
import { useChat } from 'ai/react'

function Spinner() {
  //return <div className="spinner">Loading...</div> // Customize your Spinner component here
  return <div className="spinner inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-e-transparent align-[-0.125em] text-surface motion-reduce:animate-[spin_1.5s_linear_infinite] dark:text-white" role="status">
  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span></div>
}

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat-with-vision',
  })
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [base64Images, setBase64Images] = useState<string[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileButtonClick = () => {
    fileInputRef.current?.click() // Trigger hidden file input on button click
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)

      // Generate URLs for newly selected files and add to existing URLs
      const newURLs = newFiles.map((file) => URL.createObjectURL(file))
      setImageUrls((prevURLs) => [...prevURLs, ...newURLs])

      // Encode newly selected files to Base64 and add to existing Base64 data
      const base64Promises = newFiles.map((file) => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader()

          reader.onload = (e: ProgressEvent<FileReader>) => {
            if (e.target && e.target.result) {
              resolve(e.target.result as string)
            }
          }

          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      })

      // Update state when all Base64 encodings are complete
      Promise.all(base64Promises).then((newBase64Images) => {
        setBase64Images((prevBase64Images) => [
          ...prevBase64Images,
          ...newBase64Images,
        ])
      })
    }
  }

  const handleRemoveFile = (index: number) => {
    setImageUrls((prevFileURLs) =>
      prevFileURLs.filter((_, fileIndex) => fileIndex !== index),
    )
    setBase64Images((prevBase64Images) =>
      prevBase64Images.filter((_, fileIndex) => fileIndex !== index),
    )
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const FilePreview = () =>
    imageUrls.length > 0 ? (
      <div className="flex space-x-2">
        {imageUrls.map((imageUrl, index) => (
          <Fragment key={index}>
            <div className="mb-4">
              <Image
                src={imageUrl}
                alt="File preview"
                width={700}
                height={300}
                className="rounded"
              />
              <button
                type="button"
                onClick={() => handleRemoveFile(index)}
                className="text-xs"
              >
                Delete
              </button>
              <div>
              <br></br>
              If you like to analyze this artefact, start by typing in - Classify this artefact - in the text box below or you can type your own question and press return.
              </div>
            </div>
          </Fragment>
        ))}
      </div>
    ) : null

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col space-y-4 px-4 pb-60 pt-20">
      <header className="absolute top-0 left-0 flex items-center space-x-4 p-4">
        <Image
          src="/favicon.ico" // replace with the path to your logo
          alt="Company Logo"
          width={50}
          height={50}
        />
        <h1 className="text-2xl font-bold">Sarvah - QUEST</h1>
      </header>
      {/* <nav className="absolute top-0 right-0 p-4">
        <Link className="text-white-500" href="/image-search/">
          Explore
        </Link>
      </nav> */}

      <FilePreview />
      
      {messages.length > 0
        ? messages.map((m) => (
            <div key={m.id} className="whitespace-pre-wrap">
              {m.role === 'user' ? 'User: ' : 'AI: '}
              {m.content}
            </div>
          ))
        : null}

      {isLoading ? <Spinner /> : null}

      <div className="fixed bottom-0 left-0 right-0 w-full">
        <div className="mx-auto max-w-lg px-4 py-8">
          <div className="rounded border border-gray-700 bg-gray-900 p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSubmit(e, {
                  data: {
                    base64Images: JSON.stringify(base64Images),
                  },
                })
              }}
              className="flex items-center justify-center"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                className="hidden"
              />
              <button
                type="button"
                onClick={handleFileButtonClick}
                className="mr-2 p-2"
              >
                📎
              </button>
              <input
                className="w-full rounded border border-gray-700 bg-gray-900 p-2"
                value={input}
                placeholder="Classify this artefact"
                onChange={handleInputChange}
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Fragment, useRef, useState } from 'react'
import { useChat } from 'ai/react'

function Spinner() {
  return <div className="spinner inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-e-transparent align-[-0.125em] text-surface motion-reduce:animate-[spin_1.5s_linear_infinite] dark:text-white" role="status">
    <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
  </div>
}

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat-with-vision',
  })
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [base64Images, setBase64Images] = useState<string[]>([])
  const [hasTypedFirstMessage, setHasTypedFirstMessage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageClick = (imageUrl: string) => {
    const searchParams = new URLSearchParams();
    searchParams.append('image', imageUrl);
    window.open(`/similarity-search?${searchParams.toString()}`, '_blank', 'noopener,noreferrer');
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleInputWithPlaceholder = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleInputChange(e)
    if (!hasTypedFirstMessage && e.target.value.length > 0) {
      setHasTypedFirstMessage(true)
    }
  }

  const getPlaceholderText = () => {
    if (hasTypedFirstMessage) {
      return "" // No placeholder after first message
    }
    if (imageUrls.length > 0) {
      return "Classify this artefact" // Show when image is uploaded
    }
    return "Start by uploading an artifact image .."
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      const newURLs = newFiles.map((file) => URL.createObjectURL(file))
      setImageUrls((prevURLs) => [...prevURLs, ...newURLs])

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
              <div className="relative">
                <Image
                  src={imageUrl}
                  alt="File preview"
                  width={700}
                  height={300}
                  className="rounded-lg object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2 rounded-b-lg">
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    className="text-xs text-gray-200 hover:text-white transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-400">
                Start by typing in - Classify this artifact - or any other question in the text box below and press return.
              </div>
            </div>
          </Fragment>
        ))}
      </div>
    ) : null

  const shouldCenterChat = messages.length === 0 && imageUrls.length === 0

  const MessageContent = ({ content }: { content: string }) => {
    const paragraphs = content.split('\n').filter(p => p.trim() !== '')
    return (
      <div className="space-y-4">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="leading-relaxed">{paragraph}</p>
        ))}
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col space-y-4 px-4 pb-60 pt-20">
      <header className="absolute top-0 left-0 flex items-center space-x-4 p-4">
        <Image
          src="/favicon.ico"
          alt="Company Logo"
          width={50}
          height={50}
        />
        {/* <h1 className="text-2xl font-bold">Sarvah</h1> */}
      </header>
      
      <nav className="absolute top-0 right-0 p-4"> 
        <Link className="text-white-500 hover:text-blue-400 transition-colors" href="http://localhost:3000/">
          Contribute
        </Link>
      </nav>

      <div className="flex-1 space-y-8">
        <FilePreview />
        
        {messages.map((m, index) => (
          <div key={m.id} className={`rounded-lg p-6 ${m.role === 'user' ? 'bg-gray-800' : 'bg-gray-900'}`}>
            <div className="mb-4 flex items-center">
              <div className={`h-8 w-8 rounded-full ${m.role === 'user' ? 'bg-blue-500' : 'bg-purple-500'} flex items-center justify-center`}>
                {m.role === 'user' ? 'U' : 'AI'}
              </div>
              <span className="ml-3 font-medium">
                {m.role === 'user' ? 'You' : 'AI Assistant'}
              </span>
            </div>

            <div className="prose prose-invert max-w-none">
              <MessageContent content={m.content} />
            </div>

            {m.role === 'assistant' && index === 1 && imageUrls.length > 0 && (
              <div className="mt-6 grid grid-cols-2 gap-4">
                {imageUrls.map((url, imgIndex) => (
                  <div 
                    key={imgIndex} 
                    className="relative aspect-video group cursor-pointer"
                    onClick={() => handleImageClick(url)}
                  >
                    <div className="relative w-full h-full">
                      <Image
                        src={url}
                        alt={`Analyzed image ${imgIndex + 1}`}
                        fill
                        className="rounded-lg object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="text-white text-sm font-medium px-4 py-2 bg-black bg-opacity-50 rounded-lg">
                          Click to find similar images
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {isLoading && <Spinner />}
      </div>

      <div className={`w-full transition-all duration-300 ${shouldCenterChat ? 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2' : 'fixed bottom-0 left-0 right-0'}`}>
        <div className="mx-auto max-w-4xl px-4 py-8">
          {shouldCenterChat && (
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold tracking-tight bg-gradient-to-br from-[#FFD700] via-[#FDB931] to-[#E1AD21] bg-clip-text text-transparent animate-fade-in drop-shadow-sm">
                 Sarvah Quest
              </h2>
              <p className="mt-2 text-gray-400">Explore and analyze artifacts with AI</p>
            </div>
          )}
          <div className="rounded-lg border border-gray-700 bg-gray-900 p-4 shadow-lg">
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
                className="mr-2 p-2 hover:text-blue-400 transition-colors"
              >
                📎
              </button>
              <input
                className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-sm placeholder:text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={input}
                placeholder={getPlaceholderText()}
                onChange={handleInputWithPlaceholder}
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
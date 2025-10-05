'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Fragment, useRef, useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useChat } from 'ai/react'

function Spinner() {
  return <div className="spinner inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-e-transparent align-[-0.125em] text-surface motion-reduce:animate-[spin_1.5s_linear_infinite] dark:text-white" role="status">
    <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
  </div>
}

export default function Chat() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 text-white p-8 flex items-center justify-center">
        <div className="spinner inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-e-transparent align-[-0.125em]">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    }>
      <ChatContent />
    </Suspense>
  )
}

function ChatContent() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, append } = useChat({
    api: '/api/chat-with-vision',
  })
  const searchParams = useSearchParams()
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [base64Images, setBase64Images] = useState<string[]>([])
  const [hasTypedFirstMessage, setHasTypedFirstMessage] = useState(false)
  const [expandedCards, setExpandedCards] = useState<{ [key: string]: boolean }>({})
  const [quizAnswered, setQuizAnswered] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [userLocation, setUserLocation] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<{
    region: string
    culturalBackground: string
    interests: string[]
  } | null>(null)
  const [showLocationModal, setShowLocationModal] = useState(false)

  const handleImageClick = (imageUrl: string) => {
    const searchParams = new URLSearchParams();
    searchParams.append('image', imageUrl);
    window.open(`/similarity-search?${searchParams.toString()}`, '_blank', 'noopener,noreferrer');
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleInputWithPlaceholder = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    handleInputChange(e as React.ChangeEvent<HTMLInputElement>)
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

  const toggleCard = (cardId: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }))
  }

  const handleQuizAnswer = (answer: string) => {
    setQuizAnswered(true)
    // Could add more logic here for tracking quiz results
  }

  // Helper function to map regions to cultural backgrounds
  const getCulturalBackground = (region: string): string => {
    const culturalMap: { [key: string]: string } = {
      'India': 'South Asian',
      'China': 'East Asian',
      'Japan': 'East Asian',
      'Korea': 'East Asian',
      'United States': 'Western',
      'United Kingdom': 'Western',
      'France': 'Western',
      'Germany': 'Western',
      'Italy': 'Western',
      'Spain': 'Western',
      'Brazil': 'Latin American',
      'Mexico': 'Latin American',
      'Egypt': 'Middle Eastern',
      'Turkey': 'Middle Eastern',
      'Nigeria': 'African',
      'South Africa': 'African',
      'Australia': 'Oceanic',
      'New Zealand': 'Oceanic'
    }
    
    return culturalMap[region] || 'Global'
  }

  // Location detection function
  const detectUserLocation = async () => {
    try {
      // Try to get location from browser
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        })
      })
      
      // Reverse geocoding to get country/region
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`
      )
      const data = await response.json()
      
      const region = data.countryName
      setUserLocation(region)
      
      // Set cultural background based on region
      const culturalBackground = getCulturalBackground(region)
      setUserProfile({
        region,
        culturalBackground,
        interests: []
      })
      
      // Store in localStorage
      localStorage.setItem('userProfile', JSON.stringify({
        region,
        culturalBackground,
        interests: []
      }))
      
    } catch (error) {
      console.log('Location detection failed:', error)
      // Show manual location selection
      setShowLocationModal(true)
    }
  }

  // Add useEffect to detect location on component mount
  useEffect(() => {
    // Check if user profile exists in localStorage
    const savedProfile = localStorage.getItem('userProfile')
    if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile))
    } else {
      detectUserLocation()
    }
  }, [])

  // Handle URL parameters for image loading
  useEffect(() => {
    const imageUrl = searchParams.get('image')
    if (imageUrl) {
      // Check if this image is already loaded
      setImageUrls(prev => {
        if (prev.includes(imageUrl)) {
          return prev // Image already loaded
        }
        
        // Add the image to the existing images
        const newImageUrls = [...prev, imageUrl]
        
        // Convert to base64 for the API
        fetch(imageUrl)
          .then(response => response.blob())
          .then(blob => {
            return new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = (e: ProgressEvent<FileReader>) => {
                if (e.target && e.target.result) {
                  resolve(e.target.result as string)
                }
              }
              reader.onerror = reject
              reader.readAsDataURL(blob)
            })
          })
          .then(base64Image => {
            setBase64Images(prev => {
              // Check if this base64 image is already loaded
              if (prev.some(img => img === base64Image)) {
                return prev
              }
              return [...prev, base64Image]
            })
          })
          .catch(error => {
            console.error('Error loading image from URL:', error)
          })
        
        return newImageUrls
      })
    }
  }, [searchParams])

  // Helper function to ensure image is loaded before proceeding
  const ensureImageLoaded = async (): Promise<boolean> => {
    if (base64Images.length > 0) {
      return true // Image already loaded
    }
    
    if (imageUrls.length === 0) {
      return false // No image to load
    }
    
    // Wait for image to load (with timeout)
    const maxWait = 5000 // 5 seconds
    const startTime = Date.now()
    
    while (base64Images.length === 0 && (Date.now() - startTime) < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    return base64Images.length > 0
  }

  // Artifact Spotlight Hero Section - Dynamic based on AI analysis
  const ArtifactSpotlight = ({ artifactData }: { artifactData?: any }) =>
    imageUrls.length > 0 ? (
      <div className="relative mb-8">
        <div className="relative w-full max-w-4xl mx-auto">
          <Image
            src={imageUrls[0]}
            alt="Artifact Spotlight"
            width={800}
            height={600}
            className="w-full h-auto rounded-2xl object-cover shadow-2xl"
          />
          <div className="absolute top-4 right-4">
            <button
              type="button"
              onClick={() => handleRemoveFile(0)}
              className="px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-lg"
            >
              ✕ Remove Image
            </button>
          </div>
        </div>
      </div>
    ) : null

  const shouldCenterChat = messages.length === 0 && imageUrls.length === 0

  // Simple artifact data extraction for hero section only
  const getArtifactTitle = (messages: any[]) => {
    if (messages.length === 0) return null
    
    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'assistant') return null
    
    const content = lastMessage.content
    const titleMatch = content.match(/(?:This is|Meet|Discover)\s+([^—\n]+)(?:—|,|\n)/i)
    return titleMatch ? titleMatch[1].trim() : null
  }

  // Handle specific view requests
  const handleViewRequest = async (viewType: 'museum' | 'local' | 'deep') => {
    console.log('handleViewRequest called with:', viewType)
    
    const prompts = {
      museum: "Provide a formal, academic analysis of this artifact. Include: 1) What this artifact is and its cultural significance, 2) Historical period and context, 3) Technical details about materials and craftsmanship, 4) Current museum or scholarly understanding. Keep it professional and factual.",
      local: "Tell me the local stories, folklore, and oral traditions about this artifact. Include: 1) What local people believe about this object, 2) Legends and myths surrounding it, 3) How it's used in local ceremonies or traditions, 4) Stories passed down through generations. Focus on community perspectives and cultural memory.",
      deep: "Provide a comprehensive scholarly analysis of this artifact. Include: 1) Detailed historical research and dating, 2) Comparative analysis with similar artifacts, 3) Symbolic meanings and iconography, 4) Cultural and religious significance, 5) Academic sources and references, 6) Current research and debates about this artifact."
    }
    
    const prompt = prompts[viewType]
    console.log('Using prompt:', prompt)
    
    // Use the append function directly - this is more reliable than DOM manipulation
    try {
      console.log('Using append function with images:', base64Images.length, 'imageUrls:', imageUrls.length)
      
      // Ensure image is loaded before proceeding
      const imageLoaded = await ensureImageLoaded()
      console.log('Image loaded:', imageLoaded, 'base64Images length:', base64Images.length)
      
      if (!imageLoaded && imageUrls.length > 0) {
        console.error('Failed to load image after timeout')
        return
      }
      
      await append({
        role: 'user',
        content: prompt
      }, {
        data: {
          base64Images: JSON.stringify(base64Images),
          userProfile: JSON.stringify(userProfile),
        },
      })
      console.log('Used append function successfully')
    } catch (error) {
      console.error('Error using append function:', error)
      
      // Fallback: try DOM manipulation approach
      console.log('Falling back to DOM manipulation approach')
      const inputElement = document.querySelector('textarea[data-testid="chat-input"]') as HTMLTextAreaElement
      if (inputElement) {
        console.log('Found input element, setting value')
        // Create a synthetic input event
        const syntheticInputEvent = {
          target: { value: prompt }
        } as React.ChangeEvent<HTMLInputElement>
        
        // Update the input state
        handleInputChange(syntheticInputEvent)
        console.log('Called handleInputChange')
        
        // Wait a moment for state to update, then submit
        setTimeout(() => {
          console.log('Submitting form with images:', base64Images.length)
          const syntheticFormEvent = {
            preventDefault: () => {},
          } as React.FormEvent<HTMLFormElement>
          
          handleSubmit(syntheticFormEvent, {
            data: {
              base64Images: JSON.stringify(base64Images),
              userProfile: JSON.stringify(userProfile),
            },
          })
          console.log('Called handleSubmit')
        }, 100)
      } else {
        console.log('Input element not found in fallback')
      }
    }
  }

  // Curiosity Cards Component
  const CuriosityCard = ({ icon, title, content, isExpanded, onToggle }: { 
    icon: string, 
    title: string, 
    content: string, 
    isExpanded: boolean, 
    onToggle: () => void 
  }) => (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
      <button
        onClick={onToggle}
        className="w-full p-6 text-left flex items-center justify-between hover:bg-purple-100/50 dark:hover:bg-purple-800/30 rounded-xl transition-colors"
      >
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{icon}</span>
          <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">{title}</h3>
        </div>
        <span className={`text-purple-600 dark:text-purple-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
            </button>
      {isExpanded && (
        <div className="px-6 pb-6">
          <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{content}</p>
          </div>
        </div>
        )}
      </div>
    )

  // Quiz Component
  const QuizCard = ({ question, options, onAnswer, isAnswered, correctAnswer }: {
    question: string,
    options: string[],
    onAnswer: (answer: string) => void,
    isAnswered: boolean,
    correctAnswer: string
  }) => {
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
    const [showResult, setShowResult] = useState(false)

    const handleAnswer = (answer: string) => {
      setSelectedAnswer(answer)
      setShowResult(true)
      setTimeout(() => onAnswer(answer), 1000)
    }

    return (
      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl p-6 border border-yellow-200 dark:border-yellow-800">
        <div className="flex items-center space-x-2 mb-4">
          <span className="text-2xl">🤔</span>
          <h3 className="text-xl font-semibold text-yellow-900 dark:text-yellow-100">Pop Quiz</h3>
        </div>
        <p className="text-gray-700 dark:text-gray-300 mb-6">{question}</p>
        <div className="space-y-3">
          {options.map((option, index) => {
            const isCorrect = option === correctAnswer
            const isSelected = selectedAnswer === option
            const showCorrect = showResult && isCorrect
            const showIncorrect = showResult && isSelected && !isCorrect
    
    return (
              <button
                key={index}
                onClick={() => !showResult && handleAnswer(option)}
                disabled={showResult}
                className={`w-full p-4 rounded-lg text-left transition-all duration-200 ${
                  showCorrect 
                    ? 'bg-green-100 border-green-500 text-green-800 dark:bg-green-800 dark:text-green-100' 
                    : showIncorrect
                    ? 'bg-red-100 border-red-500 text-red-800 dark:bg-red-800 dark:text-red-100'
                    : isSelected
                    ? 'bg-yellow-100 border-yellow-500 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                    : 'bg-white/50 hover:bg-yellow-100/50 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                } border-2`}
              >
                <div className="flex items-center justify-between">
                  <span>{option}</span>
                  {showCorrect && <span className="text-2xl">🎉</span>}
                  {showIncorrect && <span className="text-2xl">❌</span>}
                </div>
              </button>
            )
          })}
            </div>
        {showResult && (
          <div className="mt-4 p-4 bg-green-100 dark:bg-green-800/30 rounded-lg">
            <p className="text-green-800 dark:text-green-200 font-medium">
              {selectedAnswer === correctAnswer ? '🎉 Excellent! You got it right!' : `The correct answer is: ${correctAnswer}`}
            </p>
          </div>
        )}
      </div>
    )
  }

  // Cultural Context Indicator Component
  const CulturalContextIndicator = () => {
    if (!userProfile) return null
    
    return (
      <div className="fixed top-20 right-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-3 shadow-lg z-40">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🌍</span>
          <div>
            <p className="text-white text-sm font-medium">{userProfile.region}</p>
            <p className="text-purple-200 text-xs">{userProfile.culturalBackground}</p>
          </div>
          <button
            onClick={() => setShowLocationModal(true)}
            className="text-white hover:text-purple-200 transition-colors"
          >
            ✏️
          </button>
        </div>
      </div>
    )
  }

  // Location Selection Modal
  const LocationModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4">
        <h3 className="text-2xl font-bold text-white mb-4">Where are you from?</h3>
        <p className="text-gray-300 mb-6">
          Help us personalize your cultural exploration experience!
        </p>
        
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            'India', 'China', 'Japan', 'Korea', 'United States', 'United Kingdom',
            'France', 'Germany', 'Italy', 'Spain', 'Brazil', 'Mexico',
            'Egypt', 'Turkey', 'Nigeria', 'South Africa', 'Australia', 'Other'
          ].map((region) => (
            <button
              key={region}
              onClick={() => {
                const culturalBackground = getCulturalBackground(region)
                setUserProfile({ region, culturalBackground, interests: [] })
                setShowLocationModal(false)
                localStorage.setItem('userProfile', JSON.stringify({
                  region, culturalBackground, interests: []
                }))
              }}
              className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
            >
              {region}
            </button>
          ))}
        </div>
        
        <button
          onClick={() => setShowLocationModal(false)}
          className="w-full p-3 bg-gray-600 hover:bg-gray-500 rounded-lg text-white transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  )

  // Explore More Section
  const ExploreMore = () => (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-indigo-200 dark:border-indigo-800">
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-2xl">🔍</span>
        <h3 className="text-xl font-semibold text-indigo-900 dark:text-indigo-100">Explore More</h3>
      </div>
      <p className="text-gray-700 dark:text-gray-300 mb-6">
        Want to see her companions? 👉 Click to meet Shiva & Ganesha
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { name: "Shiva", description: "The Destroyer & Creator", emoji: "🕉️" },
          { name: "Ganesha", description: "The Remover of Obstacles", emoji: "🐘" },
          { name: "Krishna", description: "The Divine Flutist", emoji: "🎵" }
        ].map((companion, index) => (
          <div key={index} className="bg-white/50 dark:bg-black/20 rounded-lg p-4 hover:bg-white/70 dark:hover:bg-black/40 transition-all duration-200 cursor-pointer group">
            <div className="text-center">
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform duration-200">{companion.emoji}</div>
              <h4 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-1">{companion.name}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{companion.description}</p>
            </div>
          </div>
        ))}
        </div>
      </div>
    )


  // Enhanced message content display with card-based layout
  const MessageContent = ({ content }: { content: string }) => {
    const parseContent = (text: string) => {
      const lines = text.split('\n').filter(line => line.trim() !== '')
      const sections: Array<{ type: string; content: string; level?: number }> = []
      
      for (const line of lines) {
        const trimmed = line.trim()
        
        // Detect headers (lines that start with numbers or are short and bold-looking)
        if (/^\d+[\.\)]\s/.test(trimmed) || /^[A-Z][^a-z]*:?\s*$/.test(trimmed) || trimmed.length < 50 && trimmed.endsWith(':')) {
          sections.push({ type: 'header', content: trimmed })
        }
        // Detect lists (lines starting with bullet points or dashes)
        else if (/^[\-\*•]\s/.test(trimmed) || /^\d+[\.\)]\s/.test(trimmed)) {
          sections.push({ type: 'list-item', content: trimmed })
        }
        // Detect questions (lines ending with ?)
        else if (trimmed.endsWith('?')) {
          sections.push({ type: 'question', content: trimmed })
        }
        // Detect important facts or highlights (lines with key terms)
        else if (/\b(important|significant|notable|key|crucial|essential)\b/i.test(trimmed) || 
                 /\b(discovered|found|revealed|shows|indicates)\b/i.test(trimmed)) {
          sections.push({ type: 'highlight', content: trimmed })
        }
        // Regular paragraphs
        else {
          sections.push({ type: 'paragraph', content: trimmed })
        }
      }
      
      return sections
    }

    const sections = parseContent(content)
    
    return (
      <div className="space-y-6">
        {sections.map((section, index) => {
          switch (section.type) {
            case 'header':
              return (
                <div key={index} className="bg-gradient-to-r from-blue-500/15 to-purple-500/15 border-l-4 border-blue-400 rounded-r-xl p-6 shadow-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">📋</span>
                    <h3 className="text-xl font-bold text-blue-100">{section.content}</h3>
                  </div>
                </div>
              )
            case 'question':
              return (
                <div key={index} className="bg-gradient-to-r from-yellow-500/15 to-orange-500/15 border border-yellow-400/40 rounded-xl p-6 shadow-lg">
                  <div className="flex items-start space-x-4">
                    <span className="text-3xl">❓</span>
                    <p className="text-yellow-100 font-semibold text-lg">{section.content}</p>
                  </div>
                </div>
              )
            case 'highlight':
              return (
                <div key={index} className="bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-400/40 rounded-xl p-6 shadow-lg">
                  <div className="flex items-start space-x-4">
                    <span className="text-2xl">✨</span>
                    <p className="text-emerald-100 font-medium leading-relaxed">{section.content}</p>
                  </div>
                </div>
              )
            case 'list-item':
              return (
                <div key={index} className="bg-gray-800/60 border border-gray-600/50 rounded-xl p-5 ml-6 shadow-md hover:bg-gray-800/70 transition-colors">
                  <div className="flex items-start space-x-4">
                    <span className="text-blue-400 mt-1 text-lg">•</span>
                    <p className="text-gray-200 leading-relaxed">{section.content.replace(/^[\-\*•]\s/, '').replace(/^\d+[\.\)]\s/, '')}</p>
                  </div>
                </div>
              )
            case 'paragraph':
            default:
              return (
                <div key={index} className="bg-gray-800/40 border border-gray-700/60 rounded-xl p-6 shadow-md hover:bg-gray-800/50 transition-colors">
                  <p className="text-gray-200 leading-relaxed text-base">{section.content}</p>
                </div>
              )
          }
        })}
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col space-y-4 px-4 pb-60 pt-20">
      {/* Cultural Context Indicator */}
      <CulturalContextIndicator />
      
      {/* Location Selection Modal */}
      {showLocationModal && <LocationModal />}
      
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
        {/* <Link className="text-white-500 hover:text-blue-400 transition-colors" href="http://dev.sarvah.ai:3002/accounts/login/" target="_blank"
  rel="noopener noreferrer">
          Login
        </Link> */}
      </nav>

      <div className="flex-1 space-y-8">
        {(() => {
          const artifactTitle = getArtifactTitle(messages)
          return <ArtifactSpotlight artifactData={{ title: artifactTitle }} />
        })()}
        
        {/* View Selection - Show when image is uploaded */}
        {imageUrls.length > 0 && (
          <div className="space-y-6">
            <div className="text-center py-4">
              <h2 className="text-2xl font-bold text-gray-200 mb-2">Choose Your Perspective</h2>
              <p className="text-gray-400">Select how you&apos;d like to explore this artifact</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => handleViewRequest('museum')}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 text-left group"
              >
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-2xl">🏛️</span>
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Museum Voice</h3>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">Formal, academic analysis with historical context and technical details.</p>
                <div className="text-blue-600 dark:text-blue-400 text-sm font-medium group-hover:text-blue-800 dark:group-hover:text-blue-200">
                  Get Academic Analysis →
                </div>
              </button>
              
              <button
                onClick={() => handleViewRequest('local')}
                className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 text-left group"
              >
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-2xl">🗣️</span>
                  <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">Local Story</h3>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">Folklore, legends, and oral traditions from the community.</p>
                <div className="text-green-600 dark:text-green-400 text-sm font-medium group-hover:text-green-800 dark:group-hover:text-green-200">
                  Hear Local Stories →
                </div>
              </button>
              
              <button
                onClick={() => handleViewRequest('deep')}
                className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 text-left group"
              >
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-2xl">📚</span>
                  <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">Deep Dive</h3>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">Comprehensive scholarly analysis with research and references.</p>
                <div className="text-purple-600 dark:text-purple-400 text-sm font-medium group-hover:text-purple-800 dark:group-hover:text-purple-200">
                  Explore Deep Research →
                </div>
              </button>
            </div>
        
        {/* Sample Questions - Show when image is uploaded but no messages yet */}
            {messages.length === 0 && (
          <div className="text-center py-6">
                <p className="text-sm text-gray-500 mb-4">Or ask a specific question about your uploaded image:</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  const inputElement = document.querySelector('textarea[placeholder*="Classify this artefact"]') as HTMLTextAreaElement
                  if (inputElement) {
                        inputElement.value = "What is this artifact and what culture created it?"
                    inputElement.focus()
                    // Trigger input change event to update the state
                    const event = new Event('input', { bubbles: true })
                    inputElement.dispatchEvent(event)
                  }
                }}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30 rounded-lg text-sm text-blue-300 hover:from-blue-500/30 hover:to-indigo-500/30 hover:border-blue-400/50 transition-all duration-200 hover:scale-105"
              >
                    🔍 What is this?
              </button>
              <button
                onClick={() => {
                  const inputElement = document.querySelector('textarea[placeholder*="Classify this artefact"]') as HTMLTextAreaElement
                  if (inputElement) {
                        inputElement.value = "Tell me the story and history behind this artifact"
                    inputElement.focus()
                    // Trigger input change event to update the state
                    const event = new Event('input', { bubbles: true })
                    inputElement.dispatchEvent(event)
                  }
                }}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg text-sm text-purple-300 hover:from-purple-500/30 hover:to-pink-500/30 hover:border-purple-400/50 transition-all duration-200 hover:scale-105"
              >
                    ✨ Story & History
              </button>
              <button
                onClick={() => {
                  const inputElement = document.querySelector('textarea[placeholder*="Classify this artefact"]') as HTMLTextAreaElement
                  if (inputElement) {
                        inputElement.value = "Explain the symbolism and meaning of this artifact"
                    inputElement.focus()
                    // Trigger input change event to update the state
                    const event = new Event('input', { bubbles: true })
                    inputElement.dispatchEvent(event)
                  }
                }}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-lg text-sm text-amber-300 hover:from-amber-500/30 hover:to-orange-500/30 hover:border-amber-400/50 transition-all duration-200 hover:scale-105"
              >
                    🔮 Symbolism & Meaning
              </button>
            </div>
              </div>
            )}
          </div>
        )}
        
        {messages.map((m, index) => (
          <div key={m.id} className={`rounded-2xl p-8 transition-all duration-300 hover:shadow-2xl ${m.role === 'user' ? 'bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-750 hover:to-gray-850 border border-gray-700' : 'bg-gradient-to-br from-gray-900 to-black hover:from-gray-850 hover:to-gray-900 border border-gray-800'}`}>
            <div className="mb-6 flex items-center">
              <div className={`h-10 w-10 rounded-full ${m.role === 'user' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-purple-500 to-purple-600'} flex items-center justify-center transition-transform duration-200 hover:scale-110 shadow-lg`}>
                <span className="text-white font-bold text-sm">
                  {m.role === 'user' ? 'U' : 'AI'}
                </span>
              </div>
              <div className="ml-4">
                <span className="text-lg font-semibold text-gray-100">
                  {m.role === 'user' ? 'You' : 'Sarvah AI'}
                </span>
                {m.role === 'assistant' && (
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-green-400 font-medium">Enhanced Analysis</span>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
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
              <p className="mt-2 text-gray-400">Explore & Engage with Cultural Artifacts</p>
            </div>
          )}
          <div className="rounded-lg border border-gray-700 bg-gray-900 p-4 shadow-lg">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSubmit(e, {
                  data: {
                    base64Images: JSON.stringify(base64Images),
                    userProfile: JSON.stringify(userProfile),
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
              <textarea
                data-testid="chat-input"
                className="w-full rounded-lg border border-gray-700 bg-gray-900 p-3 text-sm placeholder:text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none min-h-[60px] max-h-[200px]"
                value={input}
                placeholder={getPlaceholderText()}
                onChange={handleInputWithPlaceholder}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    // Trigger form submission
                    const form = e.currentTarget.closest('form')
                    if (form) {
                      form.requestSubmit()
                    }
                  }
                }}
                rows={3}
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
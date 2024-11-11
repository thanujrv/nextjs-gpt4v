'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'

interface SimilarImageText {
  description?: string;
  name?: string;
  author?: string;
  date?: string;
  school?: string;
  technique?: string;
  title?: string;
  type?: string;
  timeframe?: string;
}

interface SimilarImage {
  image: string;
  score: number;
  text: SimilarImageText;
}

export default function SimilaritySearch() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 text-white p-8 flex items-center justify-center">
        <div className="spinner inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-e-transparent align-[-0.125em]">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    }>
      <SimilaritySearchContent />
    </Suspense>
  )
}

function SimilaritySearchContent() {
  const searchParams = useSearchParams()
  const [sourceImage, setSourceImage] = useState<string>('')
  const [similarImages, setSimilarImages] = useState<SimilarImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  const getBase64FromUrl = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch image');
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            const base64Data = reader.result.split(',')[1];
            resolve(base64Data);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image to base64:', error);
      throw error;
    }
  };

  useEffect(() => {
    const imageUrl = searchParams.get('image')
    if (imageUrl) {
      setSourceImage(imageUrl)
      fetchSimilarImages(imageUrl)
    }
  }, [searchParams])

  const fetchSimilarImages = async (imageUrl: string) => {
    try {
      setLoading(true)
      setError(null)

      const base64Data = await getBase64FromUrl(imageUrl);
      
      const response = await fetch('https://dev.sarvah.ai/api/v0/imgsearch/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: "",
          image_data: base64Data
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch similar images')
      }
      
      const data = await response.json()
      setSimilarImages(data)
    } catch (error) {
      console.error('Error fetching similar images:', error)
      setError('Failed to load similar images. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const handleImageError = (imageUrl: string) => {
    setFailedImages(prev => new Set(prev).add(imageUrl))
  }

  const ImageWithFallback = ({ src, alt, ...props }: { src: string, alt: string, [key: string]: any }) => {
    if (failedImages.has(src)) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400">
          <span>Image not available</span>
        </div>
      );
    }

    return (
      <Image
        src={src}
        alt={alt}
        onError={() => handleImageError(src)}
        {...props}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Similar Artifacts</h1>
          <button 
            onClick={() => window.close()} 
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
        
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg mb-8">
            {error}
          </div>
        )}
        
        {sourceImage && (
          <div className="mb-8 p-6 bg-gray-900 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Source Image</h2>
            <div className="relative w-64 h-64">
              <ImageWithFallback
                src={sourceImage}
                alt="Source image"
                fill
                className="rounded-lg object-cover"
              />
            </div>
          </div>
        )}

        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Similar Artifacts Found</h2>
          
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="spinner inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-e-transparent align-[-0.125em]">
                <span className="sr-only">Loading...</span>
              </div>
            </div>
          ) : similarImages.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {similarImages.map((item, index) => (
                <div key={index} className="bg-gray-900 rounded-lg overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    <div className="relative w-full md:w-64 h-64">
                      <ImageWithFallback
                        src={item.image}
                        alt={item.text.title || `Similar image ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="p-6 flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-semibold mb-1">
                            {item.text.title || item.text.name || 'Untitled'}
                          </h3>
                          {item.text.author && (
                            <p className="text-gray-400">{item.text.author}</p>
                          )}
                        </div>
                        <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm">
                          {(item.score * 100).toFixed(1)}% match
                        </span>
                      </div>
                      
                      {item.text.description && (
                        <p className="text-gray-300 mb-4">{item.text.description}</p>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {item.text.date && (
                          <div>
                            <span className="text-gray-400">Date:</span> {item.text.date}
                          </div>
                        )}
                        {item.text.school && (
                          <div>
                            <span className="text-gray-400">School:</span> {item.text.school}
                          </div>
                        )}
                        {item.text.technique && (
                          <div>
                            <span className="text-gray-400">Technique:</span> {item.text.technique}
                          </div>
                        )}
                        {item.text.type && (
                          <div>
                            <span className="text-gray-400">Type:</span> {item.text.type}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No similar artifacts found.</p>
          )}
        </div>
      </div>
    </div>
  )
}
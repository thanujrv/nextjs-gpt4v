import OpenAI from 'openai'
import { OpenAIStream, StreamingTextResponse } from 'ai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

export const runtime = 'edge'

const fetchContextMessages = async (base64Image: string) => {
  try {
    const response = await fetch('https://dev.sarvah.ai/api/v0/qa/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: 'Find similar context',
        image_data: base64Image.split(',')[1]
      }),
    });
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching context messages:', error);
    throw new Error('Failed to fetch context messages');
  }
};

export async function POST(req: Request) {
  const { messages, data } = await req.json()

  const initialMessages = messages.slice(0, -1)
  const currentMessage = messages[messages.length - 1]

  const base64Images: string[] = JSON.parse(data.base64Images)
  const userProfile = data.userProfile ? JSON.parse(data.userProfile) : null

  const images = base64Images.map((base64Image) => ({
    type: 'image_url',
    image_url: {url: base64Image},
  }))

  const contextMessages = await fetchContextMessages(base64Images[0]);

  // Create personalized system prompt based on user profile
  const getPersonalizedSystemPrompt = (profile: any) => {
    const basePrompt = `
      You are **Sarvah** – a playful cultural detective who loves uncovering the fascinating stories behind art, culture, and heritage! 🎨✨

      Your mission: Answer questions with enthusiasm, curiosity, and just the right amount of fun facts. Think of yourself as that friend who always knows the coolest cultural tidbits and can't wait to share them!
    `

    if (profile) {
      const { region, culturalBackground } = profile
      
      return basePrompt + `
      
      PERSONALIZATION CONTEXT:
      The user is from ${region} with a ${culturalBackground} cultural background. 
      
      When discussing artifacts and cultural topics:
      - Draw connections to their regional culture when relevant
      - Use examples and references they might be familiar with
      - Explain cultural concepts in ways that relate to their background
      - Highlight cross-cultural connections and influences
      - Use appropriate cultural context and sensitivity
      
      For example:
      - If they're from India: Reference Indian art traditions, festivals, or cultural practices
      - If they're from Europe: Connect to European art movements, museums, or historical periods
      - If they're from East Asia: Reference Asian aesthetics, philosophy, or artistic traditions
      - If they're from the Americas: Connect to indigenous cultures, colonial influences, or local traditions
      
      Always maintain respect and cultural sensitivity while making these connections.
      
      IMPORTANT: Structure your responses using these specific markers to enable rich UI components:
      `
    }
    
    return basePrompt + `
      IMPORTANT: Structure your responses using these specific markers to enable rich UI components:
      `
  }

  const systemPrompt = getPersonalizedSystemPrompt(userProfile) + `

      For historical stories and cultural context, use:
      STORY:
      Title: [Story Title]
      Content: [The main story content]
      Timestamp: [Historical period or date]
      Location: [Geographic location if relevant]
      Significance: [Why this story matters culturally]

      For connections between artifacts, periods, or cultures, use:
      CONNECTIONS:
      [Connection details in a structured format]

      For provenance and source information, use:
      PROVENANCE:
      [Source details and reliability information]

      For technical analysis of artifacts, use:
      TECHNICAL:
      Material: [Material composition]
      Technique: [Creation technique]
      Period: [Historical period]
      Style: [Artistic style or movement]

      For cultural significance and context, use:
      CULTURE:
      People: [Associated culture or people]
      Traditions: [Related traditions or practices]
      Influence: [Cultural influence or impact]

      Keep it:
      - Playful and engaging (use emojis, fun analogies, and conversational tone)
      - Short and sweet (get to the point quickly)
      - Relevant (stick to what the user actually asked)
      - Surprising (share those "wow, I didn't know that!" moments)

      Always include at least one STORY: section when analyzing artifacts to provide rich cultural context! 🌟
    `
  

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1',
    stream: true,
    max_tokens: 1500,
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: "Additional context for reference: These images and text are from a similar artist or style. You can use these references to provide a better answer to the user question : - " + JSON.stringify(contextMessages[0]['text'])
          },
          {
            type: 'image_url',
            image_url: contextMessages[0]['image']
          }
        ]
      },
      ...initialMessages,
      {
        ...currentMessage,
        content: [{ type: 'text', text: currentMessage.content }, ...images],
      },
    ],
  })

  const stream = OpenAIStream(response)

  return new StreamingTextResponse(stream)
}

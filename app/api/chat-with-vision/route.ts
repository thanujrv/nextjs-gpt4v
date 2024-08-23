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

  const images = base64Images.map((base64Image) => ({
    type: 'image_url',
    image_url: {url: base64Image},
  }))

  const contextMessages = await fetchContextMessages(base64Images[0]);

  const systemPrompt = `
          You are an Art and Artifact Contextualization Expert with a profound understanding of art history and cultural heritage. Your role is to provide detailed insights and context for a wide range of artworks and artifacts, helping to explain their historical significance, cultural background, and artistic value. Your knowledge spans from ancient civilizations to contemporary societies, and you are adept at making connections between different periods, cultures, and artistic movements. You can elucidate the stories behind artworks and artifacts, making them accessible and engaging to a diverse audience.

          Here are some guidelines to follow:
          
          1. Identification and Historical Context: Try to Identify the artefact using the details present in the image, by analyzing the style of the painting and also using additional context in the form of messages provided by the user. But don't mention explicitly that you found it in the past messages or mention the number of the image. Those messages are for your reference alone. Focus on provinding the identity information as accurate as possible. Provide comprehensive background information on the time period, geographical location, and cultural environment in which the artwork or artifact was created. Explain its significance within these contexts. Identify specific stylistic characteristics that are indicative of particular artists or art movements. Compare these characteristics with known works of potential artists.
          
          2. Cultural Significance: Discuss the cultural, religious, and social importance of the artwork or artifact. Highlight how it reflects or influenced the culture it originated from.
          
          3. Artistic Analysis: Offer detailed analysis of the artistic elements, techniques, and materials used. Discuss the artist or creator if known, and their influence on the work. Provide a thorough analysis of the painting, including its composition, use of color, brushwork, and subject matter. Discuss any distinctive features that stand out. Based on your analysis, suggest the most likely artist or a shortlist of possible artists. Explain your reasoning by highlighting key similarities between the painting and the known works of these artists.
          
          4. Comparative Context: Compare and contrast the artwork or artifact with other similar works from the same period or different periods to highlight unique features and common themes.
          
          5. Accessible Language: Explain complex concepts in a way that is easy to understand without oversimplifying. Use clear and precise language.
          
          6. Engaging and Informative: Keep the discussion engaging by highlighting interesting facts, anecdotes, and lesser-known details about the artworks and artifacts.
          
          7. Cultural Sensitivity: Be mindful and respectful of the cultural contexts and significance of artworks and artifacts from diverse cultures and time periods.
          
          8. Further Exploration: Provide suggestions for additional resources, readings, and related topics for those interested in exploring the subject matter further.

          9. Follow up Questions examples: Suggest users some of the follow up questions which they can ask to understand the historical context in a better way.
          
          Examples of Tasks:
          
          - Explain the historical and cultural context of the Terracotta Army in China, including its significance in Qin Dynasty burial practices.
          - Discuss the artistic techniques and cultural symbolism in ancient Egyptian hieroglyphs.
          - Analyze the influence of Greek mythology on Renaissance art, citing specific examples.
          - Provide a detailed contextualization of African tribal masks, including their use in rituals and ceremonies.
          - Compare the stylistic elements and cultural contexts of Japanese ukiyo-e prints with European impressionist paintings.
          
          Pointers for Further Exploration:
          
          - Suggest academic books, journal articles, or documentaries that delve deeper into the historical period or cultural background of the artwork or artifact.
          - Recommend visiting specific museums, galleries, or online archives where similar artworks or artifacts can be viewed.
          - Highlight influential scholars, historians, or artists whose work has significantly contributed to the understanding of the topic.
          - Provide links to reputable websites or online courses that offer more in-depth knowledge about the discussed themes.
          - Encourage exploring related art movements, cultural practices, or historical events that provide a broader context to the discussed artwork or artifact.
          `;
  

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
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

// Import necessary libraries and modules
import ForgeUI, { render, ContentAction, useState } from '@forge/ui';
import { useProductContext } from "@forge/ui";
import api, { route } from "@forge/api";
import { Configuration, OpenAIApi } from 'openai';
import tty from 'tty';

// Define the main component of the app
const App = () => {
  // Get the current context (e.g., Confluence page) information
  const context = useProductContext();
  const pageId = context.contentId

  // Use state to fetch and store page data asynchronously
  const [pageData] = useState(async () => {
    return await getPageData(pageId);
  });

  // Define a prompt to be used for the OpenAI API
  const prompt = `Here is the data:"${pageData}"
  Give me 5 most important keywords from the text. Return the results in the form of JavaScript array. 
  The response shouldn't have anything apart from the array. No extra text or JavaScript formatting.`

  // Use state to call OpenAI API and store the result (keywords)
  const [keywords] = useState(async () => {
    return await callOpenAI(prompt);
  });

  // Use state to add the extracted keywords as labels to the current page
  const [response] = useState(async () => {
    return await addKeywordsToLabels(keywords, pageId);
  });

  // Log the response from adding keywords as labels
  console.log(response)

  // Render nothing as the main purpose is API interactions and data processing
  return (null);
};

// Render the main component within a ContentAction
export const run = render(
  <ContentAction>
    <App/>
  </ContentAction>
);

// Function to fetch page data from Confluence
const getPageData = async (pageId) => {
  const response = await api.asApp().requestConfluence(route`/wiki/api/v2/pages/${pageId}?body-format=storage`, {
    headers: {
      'Accept': 'application/json'
    }
  });
  
  // Log the response status and text
  console.log(`Response: ${response.status} ${response.statusText}`);

  // Extract and return the content of the page
  const responseData = await response.json()
  const returnedData = responseData.body.storage.value
  
  return returnedData
}

// Function to add keywords as labels to the current page
const addKeywordsToLabels = async (keywords, pageId) => {
  // Parse the keywords and prepare them for adding as labels
  const bodyData = JSON.parse(keywords).map(label => ({
    prefix: "global",
    name: label.split(" ").join("-")
  }));

  // Log the formatted data to be added as labels
  console.log(`bodyData - ${JSON.stringify(bodyData)}`)

  // Make a request to Confluence API to add labels to the page
  const response = await api.asApp().requestConfluence(route`/wiki/rest/api/content/${pageId}/label`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bodyData)
  });
  
  // Log the response status and text
  console.log(`Response: ${response.status} ${response.statusText}`);
  
  // Parse and return the response JSON
  const responseJson = await response.json()

  return responseJson
}


// Function to interact with the OpenAI API using a given prompt
const callOpenAI = async (prompt) => {

  // Polyfilling tty.isatty due to a limitation in the Forge runtime
  // This is done to prevent an error caused by a missing dependency
  tty.isatty = () => { return false };

  // Create a configuration object for OpenAI API
  const configuration = new Configuration({
    apiKey: process.env.OPEN_API_KEY,          // Replace with your actual API key
    organisation: process.env.OPEN_ORG_ID     // Replace with your actual organisation ID
  });

  // Log the API configuration for debugging purposes
  console.log(configuration)

  // Create an instance of the OpenAIApi with the provided configuration
  const openai = new OpenAIApi(configuration);

  // Log the prompt that will be sent to the OpenAI API
  console.log(prompt)
  
  // Create a chat completion request using the OpenAI API
  const chatCompletion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",  // Specify the model to use (GPT-3.5 Turbo)
    messages: [{
      role: "user",         // Role of the user in the conversation
      content: prompt       // The user's input prompt
    }]
  });
  
  // Extract the response content from the API response
  const response = chatCompletion.data.choices[0].message.content;
  
  // Log the generated response for debugging purposes
  console.log("Prompt response - " + response);
  
  // Return the generated response from the OpenAI API
  return response;
}

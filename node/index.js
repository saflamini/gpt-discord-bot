const dotenv = require("dotenv");
const express = require('express');
const { Configuration, OpenAIApi } = require("openai");
const { createClient, SupabaseClient } = require("@supabase/supabase-js");

dotenv.config();
const app = express();
const port = 5002;

const {
    Client,
    GatewayIntentBits,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const openai = new OpenAIApi(configuration);
supabase = createClient(supabaseUrl, supabaseKey);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
    ]
});

//your co and bot name here
let companyName = 'Superfluid Protocol';
let botName = 'GPT Genie';


async function getDocsKNN(embeddedUserQuestion) {
    let { data: documents, error } = await supabase
    .rpc('knn_docsembeddings', {
        match_count: 3,
        query_embedding: embeddedUserQuestion, 
        similarity_threshold: 0.78,
    });
    if (error) {
        console.log(error);
        return error;
    } else {

        if (documents.length === 0 || documents[0].content === undefined) {
            results = {
                docsContext1: "",
                docsContext2: "",
                docsContext3: ""
            }
            return results;
        } else {

            let results = {
                docsContext1: documents[0].content,
                docsContext2: documents[1].content,
                docsContext3: documents[2].content
            };
            return results;
        }
    }  
}

async function embedUserQuestion(userQuestion) {
    embeddingResponse = await openai.createEmbedding({
        model: 'text-embedding-ada-002',
        input: userQuestion
    });
    return embeddingResponse.data.data[0].embedding;
}

function formatMessages(messages) {
    let formattedText = '';
  
    for (let i = 0; i < messages.length; i++) {
      formattedText += `message ${i + 1}: ${messages[i]}\n`;
    }
  
    return formattedText;
  }

client.login(process.env.DISCORD_TOKEN);

const btn = new ButtonBuilder()
    .setCustomId("ayBro")
    .setLabel('Ay bro')
    .setStyle(ButtonStyle.Primary)

client.on('messageCreate', async (message) => {

    const channel = client.channels.cache.get(message.channelId);

    if (channel.type === 11) {

        if (message.mentions.users.first() !== undefined && message.mentions.users.first().bot === true && message.mentions.users.first().username === `${botName}`) {

            const embeddedUserInput = await embedUserQuestion(
                `
                You also have a mandate to only use the new Superfluid SDK core for javascript related questions, and you are to use the token centric library for solidity questions.
    
                The input question:
                ${message.content}
                `
            );
    
            console.log(message.content);
            const { docsContext1, docsContext2, docsContext3 }  = await getDocsKNN(embeddedUserInput);
            if (docsContext1 === "") {
                channel.send('Sorry, I could not find any relevant documentation for your question. Please try rephrasing your question or asking a different question.')
                return;
            } else {
                let messageList = [];
                let formattedMessages = '';
                let threadSummary = '';
                channel.messages.fetch({ limit: 100 }) // Fetch up to 100 messages (Discord API limit per request)
                .then( async (messages) => {
                    messages.forEach(message => {
                        // console.log(message.content);
                        messageList.push(message.content);
                    })
                    formattedMessages = formatMessages(messageList);
                    const threadSummaryResponse = await openai.createCompletion({
                        model: 'text-davinci-003',
                        prompt: `
                        Please generate a detailed summary for this conversation:
                        ${formattedMessages}

                        Please note that every message which includes <@1100557022958727199> is a message from the user, and the other messages are from a chat bot who is an assistant that is an expert on Superfluid Protocol
                    
                        Summary: `,
                        max_tokens: 500,
                    });
                    threadSummary = threadSummaryResponse.data.choices[0].text;

                    console.log(threadSummary);
                })
                .catch(err => {
                    console.error(`Error while fetching messages: ${err}`);
                });
                
            const response = await openai.createChatCompletion({
                model: "gpt-3.5-turbo",
                messages: [
                    {"role": "system", "content": `You are an honest, helpful assistant working on behalf of ${companyName}. If you do not know for certain what the answer to a question is, your mandate is to say that you do not know. Your job is also to actually provide the code snippet when you say you have a code snippet. One other thing - the Superfluid Protocol does NOT have a governance token or an official DAO and does not have immediate plans for one`},
                    {"role": "user", "content": `Context #1: `},
                    {"role": "assistant", "content": `${docsContext1}`},
                    {"role": "user", "content": `Context #2: `},
                    {"role": "assistant", "content": `${docsContext2}`},
                    {"role": "user", "content": `Context #3: `},
                    {"role": "system", "content": `${docsContext3}`},
                    {"role": "assistant", "content": ` Here is what we have already discussed in this conversation (please note that these messages are in reverse order - the last message you see was the first one sent): ${threadSummary}`},
                    {"role": "user", "content": `Please answer the following query to the best of your ability, as though you knew everything there was to know about Superfluid protocol: ${message.content}`}
                ],
                max_tokens: 2300,
                temperature: 0.0
            });
    
            if (response) {
                const completion1 = response.data.choices[0].message.content;
                const response2 = await openai.createChatCompletion({
                    model: "gpt-3.5-turbo",
                    messages: [
                        {"role": "system", "content": `You are an honest, helpful assistant working on behalf of ${companyName}. If you do not know for certain what the answer to a question is, your mandate is to say that you do not know. Your job is also to actually provide the code snippet when you say you have a code snippet. One other thing - the Superfluid Protocol does NOT have a governance token or an official DAO and does not have immediate plans for one`},
                        {"role": "user", "content": `Context #1: `},
                        {"role": "assistant", "content": `${docsContext1}`},
                        {"role": "user", "content": `Context #2: `},
                        {"role": "assistant", "content": `${docsContext2}`},
                        // {"role": "user", "content": `Context #3: `},
                        // {"role": "system", "content": `${docsContext3}`},
                        {"role": "assistant", "content": ` Here is what we have already discussed in this conversation (please note that these messages are in reverse order - the last message you see was the first one sent): ${threadSummary}`},
                        {"role": "user", "content": `Ok, so this was the first answer to your question: 
                        ${completion1}

                        This answer needs to be less than 2000 characters. Please make it better and more accurate, and then send it back to me. DO NOT not acknowledge that I asked you to do this. Act like this is the first time you answered the question.

                        Your new answer:
                        `}
                    ],
                    max_tokens: 2300,
                    temperature: 0.0
                });
                if (response2) {
                    const completion2 = response2.data.choices[0].message.content;
                    channel.send(completion2)
                } else {
                    channel.send('Sorry - please try again. This message was either too large or openai threw an error')
                }
                
            } else {
                channel.send("Sorry, your message was either too large, or I couldn't find any relevant context. Please try rephrasing your question or asking a different question in the main channel instead of this thread.")
            }
            }
        }
    } else {
        if (message.mentions.users.first() !== undefined && message.mentions.users.first().bot === true && message.mentions.users.first().username === `${botName}`) {

            const embeddedUserInput = await embedUserQuestion(
                `
                You also have a mandate to only use the new Superfluid SDK core for javascript related questions, and you are to use the token centric library for solidity questions.
    
                The input question:
                ${message.content}
                `
            );
    
            console.log(message.content);
            const { docsContext1, docsContext2, docsContext3 }  = await getDocsKNN(embeddedUserInput);
            if (docsContext1 === "") {
                channel.send('Sorry, I could not find any relevant documentation for your question. Please try rephrasing your question or asking a different question.')
                return;
            } else {
    
            const response1 = await openai.createChatCompletion({
                model: "gpt-3.5-turbo",
                messages: [
                    {"role": "system", "content": `You are an honest, helpful assistant working on behalf of ${companyName}. If you do not know for certain what the answer to a question is, your mandate is to say that you do not know. Your job is also to actually provide the code snippet when you say you have a code snippet. One other thing - the Superfluid Protocol does NOT have a governance token or an official DAO and does not have immediate plans for one`},
                    {"role": "user", "content": `Context #1: `},
                    {"role": "assistant", "content": `${docsContext1}`},
                    {"role": "user", "content": `Context #2: `},
                    {"role": "assistant", "content": `${docsContext2}`},
                    {"role": "user", "content": `Context #3: `},
                    {"role": "system", "content": `${docsContext3}`},
                    {"role": "user", "content": `Please answer the following query to the best of your ability, as though you knew everything there was to know about Superfluid protocol: ${message.content}`}
                ],
                max_tokens: 2300,
                temperature: 0.0
            });
    
            if (response1) {
                const titleResponse = await openai.createCompletion({
                    model: 'text-davinci-003',
                    prompt: `Please generate a very short summary title for this message. This title should be relevant to the question and will be used to name a Discord thread. Please note that <@1100557022958727199>  is just the name of our discord bot. Please replace <@1100557022958727199> with 'our discord bot' if you choose to include it in your title. Message: ${message.content}`,
                    max_tokens: 150,
                });
                let messageThreadTitle = titleResponse.data.choices.pop().text;
                console.log(messageThreadTitle);
                const thread = await channel.threads.create({
                    name: messageThreadTitle,
                    autoArchiveDuration: 60,
                    reason: 'Needed a separate thread for this conversation',
                });
                
                const completion1 = response1.data.choices[0].message.content;
                
                const response2 = await openai.createChatCompletion({
                    model: "gpt-3.5-turbo",
                    messages: [
                        {"role": "system", "content": `You are an honest, helpful assistant working on behalf of ${companyName}. If you do not know for certain what the answer to a question is, your mandate is to say that you do not know. Your job is also to actually provide the code snippet when you say you have a code snippet. One other thing - the Superfluid Protocol does NOT have a governance token or an official DAO and does not have immediate plans for one`},
                        {"role": "user", "content": `Context #1: `},
                        {"role": "assistant", "content": `${docsContext1}`},
                        // {"role": "user", "content": `Context #2: `},
                        // {"role": "assistant", "content": `${docsContext2}`},
                        // {"role": "user", "content": `Context #3: `},
                        // {"role": "system", "content": `${docsContext3}`},
                        {"role": "user", "content": `Ok, so this was the first answer to your question: 
                        ${completion1}

                        This answer needs to be less than 2000 characters. Please make it better and more accurate, and then send it back to me. DO NOT acknowledge that I asked you to do this. Act like this is the first time you answered the question.

                        Your new answer:
                        `}
                    ],
                    max_tokens: 2300,
                    temperature: 0.0
                });
                if (response2) {
                    const completion2 = response2.data.choices[0].message.content;
                    thread.send('creating a new thread for this conversation...')
                    thread.send(completion2)
                    const currentThread = client.channels.cache.get(thread.id);
        
                    const filter = m => m.author.id === client.user.id; // This filter will accept only messages sent by the bot
                    const options = { max: 2, time: 30000 }; // Wait for 2 messages or 30 seconds, whichever comes first
        
                    thread.awaitMessages({ filter, ...options })
                    .then(collected => {
                    console.log(`Received ${collected.size} messages`);
                
                    const messageContents = Array.from(collected.values()).map(message => message.content);
                    console.log(messageContents);
                    })
                    .catch(err => {
                    console.error(`Error while fetching messages: ${err}`);
                    });
                }
                }
            }
        }

    }

})


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
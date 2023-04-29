const dotenv = require("dotenv");
const express = require('express');
const { Configuration, OpenAIApi } = require("openai");
const { createClient, SupabaseClient } = require("@supabase/supabase-js");

dotenv.config();
const app = express();
const port = 5002;


const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const supabaseUrl = 'https://socmnjxppqyhrcpsqacw.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;
const openai = new OpenAIApi(configuration);
supabase = createClient(supabaseUrl, supabaseKey);

const {
    Client,
    GatewayIntentBits,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');


const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
    ]
});


async function getDocsKNN(embeddedUserQuestion) {
    
    let { data: documents, error } = await supabase
    .rpc('docsembeddings_knn', {
        query_embedding: embeddedUserQuestion, 
        similarity_threshold: 0.78,
        match_count: 3, 
    });
    if (error) {
        console.log(error);
    } else {
        console.log("printing similar documents");  
        console.log(documents[0].content);
        console.log(documents[1].content);
        console.log(documents[2].content);
        let results = {
            docsContext1: documents[0].content,
            docsContext2: documents[1].content,
            docsContext3: documents[2].content
        };
        return results;
    }  
}

async function embedUserQuestion(userQuestion) {
    embeddingResponse = await openai.createEmbedding({
        model: 'text-embedding-ada-002',
        input: userQuestion
    });
    return embeddingResponse.data.data[0].embedding;
}


// app.get('/', (req, res) => {
//     res.send('Hello World!');
// });

client.login(process.env.DISCORD_TOKEN);

const btn = new ButtonBuilder()
    .setCustomId("ayBro")
    .setLabel('Ay bro')
    .setStyle(ButtonStyle.Primary)

client.on('messageCreate', async (message) => {

    const channel = client.channels.cache.get(message.channelId);

    if (message.mentions.users.first() !== undefined && message.mentions.users.first().bot === true && message.mentions.users.first().username === 'GPT Genie') {

        const embeddedUserInput = await embedUserQuestion(
            `
            You also have a mandate to only use the new Superfluid SDK core, not the old Superfluid js-sdk, and you are to use the token centric library whenever possible.

            The input question:
            ${message.content}
            `
        );
        const { docsContext1, docsContext2, docsContext3 }  = await getDocsKNN(embeddedUserInput);
        console.log(message.content);

        const response = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [
                {"role": "system", "content": "You are an honest, helpful assistant working on behalf of Superfluid protocol. If you do not know for certain what the answer to a question is, your mandate is to say that you do not know. Your job is also to actually provide the code snippet when you say you have a code snippet"},
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

        const titleResponse = await openai.createCompletion({
            model: 'text-davinci-003',
            prompt: `Please generate a very short summary title for this message. This title should be relevant to the question and will be used to name a Discord thread. Message: ${message.content}`,
        });
        let messageThreadTitle = titleResponse.data.choices.pop().text;
        console.log(messageThreadTitle);
        
        const thread = await channel.threads.create({
            name: messageThreadTitle,
            autoArchiveDuration: 60,
            reason: 'Needed a separate thread for this conversation',
        });
        
        const completion = response.data.choices[0].message.content;
        thread.send('creating a new thread for this conversation...')
        thread.send(completion)
    }
})


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
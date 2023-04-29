import discord
import asyncio
import re
import os
from dotenv import load_dotenv
load_dotenv()
from langchain.embeddings import OpenAIEmbeddings
from langchain.llms import OpenAI
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain.chat_models import ChatOpenAI
from langchain.prompts.chat import (
    ChatPromptTemplate,
    SystemMessagePromptTemplate,
    AIMessagePromptTemplate,
    HumanMessagePromptTemplate,
)
from langchain.schema import (
    AIMessage,
    HumanMessage,
    SystemMessage
)
from supabase import create_client, Client

#delete these and change to your own name
discord_bot_name = 'GPT Genie'
company_name = 'Superfluid Protocol'

TOKEN = os.getenv('DISCORD_TOKEN')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
GUILD = "Sam's GPT-3 Testing Server"

#Discord stuff
# Create an Intents object and specify the intents that your bot will use
intents = discord.Intents.default()
intents.members = True

client = discord.Client(intents=intents)

#supabase stuff
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

#OpenAI / langchain stuff
llm = OpenAI(model_name="text-davinci-003", temperature=0.1)
chat = ChatOpenAI(model_name="gpt-3.5-turbo", temperature=0)
embeddings = OpenAIEmbeddings()

func = supabase.functions()

#this function will query a function I've set up in supabase called docsembeddings_knn
#it takes in a user's question and returns the 3 most similar documents to that question from our supabase embeddings vector DB
@asyncio.coroutine
async def get_docs_knn(user_question_text):
    
    embedded_user_question = embeddings.embed_query(user_question_text)
    result = supabase.rpc("docsembeddings_knn", {"query_embedding": embedded_user_question, "similarity_threshold": 0.78, "match_count": 3}).execute()  
    
    print("printing similar documents")
    print('FIRST DOC')
    print(result.data[0]['content'])
    print('SECOND DOC')
    print(result.data[1]['content'])
    print('THIRD DOC')
    print(result.data[2]['content'])

    results = {
        "docsContext1": result.data[0]['content'],
        "docsContext2": result.data[1]['content'],
        "docsContext3": result.data[2]['content']
    }
    return results
    
async def test_func(loop):
    resp = await func.invoke("hello-world",invoke_options={'body':{}})
    return resp

loop = asyncio.get_event_loop()
resp = loop.run_until_complete(test_func(loop))
loop.close()

@client.event
async def on_ready():
    for guild in client.guilds:
        if guild.name == GUILD:
            break
    
    print(
        f'{client.user} is connected to the following guild:\n'
        f'{guild.name}(id: {guild.id})'
    )
    members = '\n - '.join([member.name for member in guild.members])
    print(f'Guild Members:\n - {members}')

@client.event
async def on_message(message):
    if len(message.mentions) > 0 and message.mentions[0].bot == True and message.mentions[0].name == discord_bot_name:
         # extract the message content from the message object
        message_content = message.content

        # remove user mentions from the message content using regular expressions
        message_content = re.sub(r'<@\d+>', '', message_content)

        # strip leading and trailing whitespace from the message content
        message_content = message_content.strip()

        #we'll use the result of this call to name the thread
        message_thread_title = llm(f'Please generate a very short summary title for this message. This title will be used to name a Discord thread. Message: {message_content}')

        docs_knn_results = await get_docs_knn(message_content)
        doc1 = docs_knn_results['docsContext1']
        doc2 = docs_knn_results['docsContext2']
        doc3 = docs_knn_results['docsContext3']

        msg = chat(
            messages=[
                SystemMessage(content=f'You are an honest, helpful developer assistant working on behalf of {company_name}. If you do not know for certain what the answer to a question is, your mandate is to say that you do not know. Your job is also to actually provide the code snippet when you say you have a code snippet'),
                SystemMessage(content=doc1),
                SystemMessage(content=doc2),
                SystemMessage(content=doc3),
                SystemMessage(content=message_content)
            ], 
        ).content

        channel = client.get_channel(int(message.channel.id))
        thread = await channel.create_thread(
            name=message_thread_title,
            auto_archive_duration=60,
            reason="Thread for answering user question",
        )
        
        await thread.send("Hello! We'll use this thread to answer your query...")
        await thread.typing()
        await thread.send(msg)

        return
print('Starting bot...')
client.run(TOKEN)
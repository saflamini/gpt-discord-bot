# LLM Discord Bot Template

A simple GPT discord bot with implementations in node.js and python.

## Prerequisites

1) You should have a discord server set up with a bot created. You can learn how to do this in the [first half of this tutorial](https://realpython.com/how-to-make-a-discord-bot-python/).

2) An embeddings vector DB that has been created with Supabase. You'll need to use the PGVector extension and create a function which allows you to run a k-nearest-neighbors search on the embeddings DB. There's a great tutorial on getting this set up by the Supabase team. You can find it [here](https://supabase.com/blog/openai-embeddings-postgres-vector).

3) You'll need an OpenAI API Key. You can get this from [OpenAI directly](https://platform.openai.com/account/api-keys).

4) Create a new .env file based on `.env.template` and add your Supabase URL & key, Discord token, and OpenAI API key there.

5) Finally, you should have up to date versions of node and python on your machine.


### Running the repo

Once you have your embeddings DB and discord bot set up in the Discord developer portal, you'll want to choose either the python or node implementation.

#### Node.js
1) Run `npm install` to install deps
2) Be sure to change the `companyName` and `botName` variables to reflect your company's name and the name of your bot. The `botName` MUST match the name of the discord bot you created in the Discord developer dashboard.
3) Start the server by running node node/index.js
4) Tag your bot in a new discord message with @myBotName and ask it a question. If everything works correctly, your bot should create a new thread with the chatGPT response there.


#### Python
1) Use `pip install` to install deps:
- `pip install -U discord.py`
- `pip install langchain`
- `pip install openai`
- `pip install supabase`
2) Be sure to change the `company_name` and `discord_bot_name` variables to reflect your company's name and the name of your bot. The `discord_bot_name` MUST match the name of the discord bot you created in the Discord developer dashboard.
3) Start the server by running python python/index.js
4) Tag your bot in a new discord message with @myBotName and ask it a question. If everything works correctly, your bot should create a new thread with the chatGPT response there.




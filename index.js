require('skellington')({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  port: process.env.PORT,
  startRtm: false,
  scopes: ['bot', 'chat:write:bot', 'chat:write:user', 'users:read'],
  plugins: [require('./plugins/promisify'), require('./plugins/slash')],
  botkit: {
    interactive_replies: true,
    json_file_store: './.data/'
  }
})
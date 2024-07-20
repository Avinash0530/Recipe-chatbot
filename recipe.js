const ChatBot = require('node-telegram-bot-api');
const request = require('request');
const admin = require('firebase-admin');

var serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const { getFirestore } = require('firebase-admin/firestore');

const token = '6727120950:AAEevsGaMgxX-GFHPghFL81LhwJtFLx_k3Y'; 
const bot = new ChatBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Welcome! Which Recipe do you want to know?");
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const recipe = msg.text;
    request(`https://api.api-ninjas.com/v1/recipe?query=${recipe}&X-Api-Key=QjAq4SoF1KhtXyHmGXflCYET3I4VnoQqmS9U0hyU`, function (err, response, body) {
    if (err) {
        bot.sendMessage(chatId, "Something Error has Occurred!");
        return;
    } else if (response.statusCode !== 200) {
        bot.sendMessage(chatId, "Recipe not found");
        return;
    } else {
        const recipes = JSON.parse(body);
        
        if (recipes.length === 0) {
            return;
        }
        
        const randomIndex = Math.floor(Math.random() * recipes.length);
        const randomRecipe = recipes[randomIndex];
        
        const message = `
            Title: ${randomRecipe.title}
            Ingredients: ${randomRecipe.ingredients}
            Servings: ${randomRecipe.servings}
            Instructions: ${randomRecipe.instructions}
        `;
        bot.sendMessage(chatId, message);
        
        const db = getFirestore();
        db.collection('recipes').add({
            title: randomRecipe.title,
            servings: randomRecipe.servings,
            timestamp: admin.firestore.FieldValue.serverTimestamp() 
        })
        .catch(error => {
            bot.sendMessage(chatId, "Error storing recipe. Please try again later.");
        });
    }
});
});

bot.onText(/\/history/, (msg) => {
    const chatId = msg.chat.id;
    const db = getFirestore();
    const recipesRef = db.collection('recipes');

    recipesRef.get()
    .then(querySnapshot => {
        let titles = "";
        querySnapshot.forEach(doc => {
            const data = doc.data();
            titles += `${data.title}\n`;
        });
        if (titles !== "") {
            bot.sendMessage(chatId, "List of Recipe Titles you have searched for:\n" + titles);
        } else {
            bot.sendMessage(chatId, "You haven't searched for any recipes yet.");
        }
    })
    .catch(error => {
        console.error("Error fetching recipes:", error);
        bot.sendMessage(chatId, "Error fetching recipes. Please try again later.");
    });
});
const { Api, TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const express = require('express');
const app = express();

app.use(express.json());

app.post('/bio', async (req, res) => {
    const { sessionString, username, phone, apiId, apiHash } = req.body;

    if (!sessionString || !apiId || !apiHash || (!username && !phone)) {
        return res.status(400).json({ success: false, error: "Missing parameters" });
    }

    const stringSession = new StringSession(sessionString);
    const client = new TelegramClient(stringSession, parseInt(apiId), apiHash, { connectionRetries: 5 });

    try {
        if (!client.connected) {
            await client.connect();
            client._updates.stop(); // Останавливаем updates loop
        }

        let user;

        if (username) {
            user = await client.getEntity(username);
        } else if (phone) {
            user = await client.getEntity(phone);
        }

        const fullUser = await client.invoke(
            new Api.users.GetFullUser({ id: user.id })
        );

        const bio = fullUser.about || "";

        res.json({ success: true, bio });

    } catch (error) {
        console.error("Ошибка при запросе:", error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        await client.disconnect();
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Telegram API server работает на порту ${PORT}`);
});
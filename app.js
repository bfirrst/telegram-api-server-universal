const { Api, TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const express = require('express');
const app = express();

app.use(express.json());

// Хелпер для создания и подключения клиента
async function createClient(sessionString, apiId, apiHash) {
    const client = new TelegramClient(new StringSession(sessionString), parseInt(apiId), apiHash, {
        connectionRetries: 5,
        autoReconnect: false, // отключаем авто-подключение
    });
    await client.connect();
    // Если существует цикл обновлений — остановим его, чтобы не было TIMEOUT
    if (client._updates && typeof client._updates.stop === 'function') {
        client._updates.stop();
    }
    return client;
}

// Endpoint для получения bio (информации "О себе")
app.post('/bio', async (req, res) => {
    const { sessionString, username, phone, apiId, apiHash } = req.body;
    if (!sessionString || !apiId || !apiHash || (!username && !phone)) {
        return res.status(400).json({ success: false, error: "Missing parameters" });
    }
    let client;
    try {
        client = await createClient(sessionString, apiId, apiHash);
        let user;
        if (username) {
            user = await client.getEntity(username);
        } else if (phone) {
            user = await client.getEntity(phone);
        }
        if (!user || !user.id) {
            return res.status(500).json({ success: false, error: "User not found" });
        }
        const fullUser = await client.invoke(
            new Api.users.GetFullUser({ id: user.id })
        );
        const bio = fullUser?.about || "";
        return res.json({ success: true, bio });
    } catch (error) {
        console.error("Ошибка при запросе /bio:", error);
        return res.status(500).json({ success: false, error: error.message });
    } finally {
        if (client) {
            try {
                await client.disconnect();
            } catch (err) {
                console.error("Ошибка при disconnect:", err);
            }
        }
    }
});

// Endpoint для отправки сообщения
app.post('/send', async (req, res) => {
    const { sessionString, username, phone, apiId, apiHash, message } = req.body;
    if (!sessionString || !apiId || !apiHash || (!username && !phone) || !message) {
        return res.status(400).json({ success: false, error: "Missing parameters" });
    }
    let client;
    try {
        client = await createClient(sessionString, apiId, apiHash);
        let target;
        if (username) {
            target = await client.getEntity(username);
        } else {
            target = await client.getEntity(phone);
        }
        if (!target || !target.id) {
            return res.status(500).json({ success: false, error: "Target not found" });
        }
        const result = await client.sendMessage(target, { message });
        return res.json({ success: true, result });
    } catch (error) {
        console.error("Ошибка при запросе /send:", error);
        return res.status(500).json({ success: false, error: error.message });
    } finally {
        if (client) {
            try {
                await client.disconnect();
            } catch (err) {
                console.error("Ошибка при disconnect:", err);
            }
        }
    }
});

// Endpoint для проверки валидности сессии (получение информации о текущем пользователе)
app.post('/validate', async (req, res) => {
    const { sessionString, apiId, apiHash } = req.body;
    if (!sessionString || !apiId || !apiHash) {
        return res.status(400).json({ success: false, error: "Missing parameters" });
    }
    let client;
    try {
        client = await createClient(sessionString, apiId, apiHash);
        const me = await client.getMe();
        return res.json({ success: true, user: me });
    } catch (error) {
        console.error("Ошибка при запросе /validate:", error);
        return res.status(500).json({ success: false, error: error.message });
    } finally {
        if (client) {
            try {
                await client.disconnect();
            } catch (err) {
                console.error("Ошибка при disconnect:", err);
            }
        }
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Telegram API server работает на порту ${PORT}`);
});

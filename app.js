const { Api, TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const express = require('express');
const app = express();

app.use(express.json());

// Ловим непредвиденные ошибки, чтобы процесс не завершался
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

app.post('/bio', async (req, res) => {
  const { sessionString, username, phone, apiId, apiHash } = req.body;

  if (!sessionString || !apiId || !apiHash || (!username && !phone)) {
    return res.status(400).json({ success: false, error: "Missing parameters" });
  }

  const stringSession = new StringSession(sessionString);
  const client = new TelegramClient(stringSession, parseInt(apiId), apiHash, {
    connectionRetries: 5,
    autoReconnect: false
  });

  try {
    await client.connect();

    // Если существует цикл получения обновлений, попробуем его остановить
    if (client._updates && typeof client._updates.stop === 'function') {
      client._updates.stop();
    }

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

    const bio = fullUser && fullUser.about ? fullUser.about : "";

    return res.json({ success: true, bio });
  } catch (error) {
    console.error("Ошибка при запросе:", error);
    return res.status(500).json({ success: false, error: error.message });
  } finally {
    try {
      await client.disconnect();
    } catch (err) {
      console.error("Ошибка при disconnect:", err);
    }
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Telegram API server работает на порту ${PORT}`);
});

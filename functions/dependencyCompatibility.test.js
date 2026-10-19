import test from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { once } from "node:events";
import nodemailer from "nodemailer";
import * as functions from "./index.js";

test("Firebase SDK upgrade preserves function triggers, region and scheduler timezone", () => {
  assert.equal(Object.keys(functions).length, 20);
  const counts = { callableTrigger: 0, httpsTrigger: 0, eventTrigger: 0, scheduleTrigger: 0 };
  for (const [name, fn] of Object.entries(functions)) {
    const endpoint = fn.__endpoint;
    assert.equal(endpoint.platform, "gcfv2", name);
    assert.deepEqual(endpoint.region, ["asia-east1"], name);
    const trigger = Object.keys(counts).find(key => endpoint[key]);
    assert.ok(trigger, `${name} must retain its trigger`);
    counts[trigger]++;
    if (endpoint.scheduleTrigger) {
      assert.equal(endpoint.scheduleTrigger.timeZone, "Asia/Taipei", name);
    }
  }
  assert.deepEqual(counts, { callableTrigger: 7, httpsTrigger: 1, eventTrigger: 7, scheduleTrigger: 5 });
});

test("Nodemailer upgrade preserves authenticated SMTP, CC and UTF-8 message content", { timeout: 10000 }, async t => {
  const commands = [];
  const content = [];
  const sockets = new Set();
  const server = net.createServer(socket => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.on("error", () => {});
    socket.setEncoding("utf8");
    socket.write("220 localhost test SMTP\r\n");
    let buffer = "";
    let receiving = false;
    socket.on("data", chunk => {
      buffer += chunk;
      let end;
      while ((end = buffer.indexOf("\r\n")) !== -1) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (receiving) {
          if (line === ".") {
            receiving = false;
            socket.write("250 accepted\r\n");
          } else content.push(line);
          continue;
        }
        commands.push(line);
        if (line.startsWith("EHLO")) socket.write("250-localhost\r\n250 AUTH PLAIN\r\n");
        else if (line.startsWith("AUTH PLAIN")) socket.write("235 authenticated\r\n");
        else if (line === "DATA") {
          receiving = true;
          socket.write("354 send message\r\n");
        } else if (line === "QUIT") socket.end("221 bye\r\n");
        else socket.write("250 OK\r\n");
      }
    });
  });
  t.after(async () => {
    for (const socket of sockets) socket.destroy();
    await new Promise(resolve => server.close(resolve));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const transport = nodemailer.createTransport({
    host: "127.0.0.1", port: server.address().port, secure: false, ignoreTLS: true,
    auth: { user: "sender@example.com", pass: "test-only-password" },
  });
  t.after(() => transport.close());
  const body = "入住提醒：測試內容。";
  const result = await transport.sendMail({
    from: '"Kurama Inn" <sender@example.com>', to: "guest@example.com",
    cc: ["admin@example.com"], subject: "Booking reminder", text: body, textEncoding: "base64",
  });
  assert.deepEqual(result.envelope, {
    from: "sender@example.com", to: ["guest@example.com", "admin@example.com"],
  });
  assert.equal(result.rejected.length, 0);
  assert.ok(commands.some(line => line.startsWith("AUTH PLAIN ")));
  assert.ok(content.includes("Cc: admin@example.com"));
  assert.ok(content.includes("Subject: Booking reminder"));
  assert.ok(content.includes(Buffer.from(body).toString("base64")));
});

#include <SoftwareSerial.h>

SoftwareSerial printer(10, 11);  // RX, TX

String receiveData = "";
bool printing = false;
String pendingMessage = "";
char buf[64];

void setup() {
  Serial.begin(9600);
  printer.begin(115200);
  delay(1000);
  Serial.println("Arduino Ready");
}

void loop() {
  if (printing) {
    // 打印中，只处理打印机响应，不接收新串口数据
    handlePrinterResponse();
    return;
  }

  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') {
      receiveData.trim();
      if (receiveData.length() > 0) {
        pendingMessage = receiveData;
        printing = true;
        receiveData = "";
        handlePrinterResponse();
      }
    } else {
      receiveData += c;
    }
  }
}

void handlePrinterResponse() {
  if (!printing) return;

  // 设置字体 AT+CN=48\r\n
  printer.print("AT+CN=48\r\n");

  unsigned long start = millis();
  bool ok = false;
  while (millis() - start < 2000) {
    if (printer.available()) {
      String resp = printer.readStringUntil('\n');
      resp.trim();
      if (resp.indexOf("OK") >= 0) {
        ok = true;
        break;
      }
    }
  }

  if (!ok) {
    Serial.println("Printer timeout setting font");
    printing = false;
    return;
  }

  // 打印内容
  printer.print(pendingMessage);
  printer.print("\r\n");

  start = millis();
  ok = false;
  while (millis() - start < 5000) {
    if (printer.available()) {
      String resp = printer.readStringUntil('\n');
      resp.trim();
      if (resp.indexOf("OK") >= 0 || resp.indexOf("PT") >= 0) {
        ok = true;
        break;
      }
    }
  }

  if (ok) {
    Serial.println("[PRINTED] " + pendingMessage);
  } else {
    Serial.println("[PRINT] timeout waiting for done");
  }

  pendingMessage = "";
  printing = false;
}

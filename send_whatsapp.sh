#!/bin/bash

# Configuración Crosslog - TOKEN PERMANENTE (60 días)
ACCESS_TOKEN="EAAXe2dobq6wBPZBNqQDXT0CBP0V5zHequ1KDhVh5APlbzAMkQnQKZApZAdwW9ETpYf8hU5F4dbmeibLEDwa79weUU7oxHaywaMGFWiqkTFIj0VZCWx2Fdyhi0yhAcavZBfAibG7cxopLFLuvlatFUGCiUat7ZCjNZCZC5zFOUbYk5rmaezMYUuG84GMc2tLJ4lj1Q8phAWGUlqTYRTzsHDTpiz4QKGLdOjjRKXqImFRk"
PHONE_NUMBER_ID="764420436762718"
TO_NUMBER="5491173603954"  # ✅ Tu número actualizado

echo "Enviando mensaje WhatsApp a +$TO_NUMBER..."

response=$(curl -s -X POST \
  "https://graph.facebook.com/v18.0/$PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "'$TO_NUMBER'",
    "type": "template",
    "template": {
      "name": "hello_world",
      "language": {
        "code": "en_US"
      }
    }
  }')

echo "Respuesta de la API:"
echo $response
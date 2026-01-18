import socket

# Open the file containing bad words and read them into a list
with open('badwords.txt', 'r') as f:
    bad_words = f.read().lower().split()

# Initialize the socket
s = socket.socket()

# Get the hostname
host = socket.gethostname()
print('Server will start on host : ', host)

# Get the port number from the user
port = int(input('Enter the port number : '))

# Bind the socket to the host and port
s.bind((host, port))
print()
print('Waiting for connection')
print()

# Listen for incoming connections
s.listen(1)

# Accept a connection
conn, addr = s.accept()
print(addr, ' Has connected to the server')
print()

while True:
    # Get the message from the user
    message = input(str('>> '))
    
    # Split the message into words and check for bad words
    words = message.lower().split()
    for i in range(len(words)):
        if words[i] in bad_words:
            # Replace bad words with asterisks
            words[i] = '*' * len(words[i])
    
    # Join the words back into a message
    message = ' '.join(words)
    message = message.encode()
    
    # Send the message to the client
    conn.send(message)
    print('Sent')
    print()
    
    # Receive a message from the client
    incoming_message = conn.recv(1024)
    incoming_message = incoming_message.decode()
    print('Client : ', incoming_message)
    print()
```

### Security Fixes:
1. **Syntax Error Fix**: Corrected the syntax for socket initialization, hostname retrieval, port input, binding, and listening.
2. **Null Reference Fix**: Ensured the socket `s` is initialized before use.
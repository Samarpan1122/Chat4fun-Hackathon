import socket

# Open the file containing bad words
with open('badwords.txt', 'r') as f:
    x = f.read().lower().split()

# Initialize the socket
s = socket.socket()

# Get the hostname or IP from the user
host = input("Enter hostname or host IP: ")

# Get the port number from the user
port = int(input("Enter the port number: "))

# Connect to the server
s.connect((host, port))
print('Connected to chat server')

while True:
    # Receive and decode the incoming message
    incoming_message = s.recv(1024)
    incoming_message = incoming_message.decode()
    print('Server:', incoming_message)
    print()

    # Get the message from the user
    message = input(">> ")
    m = message.split()

    # Check for bad words and replace them with asterisks
    for i in range(len(m)):
        if m[i] in x:
            m[i] = '*' * len(m[i])

    # Join the message back and send it
    message = ' '.join(m)
    message = message.encode()
    s.send(message)
    print('Sent')
    print()
import socket
f = open('badwords.txt', 'r')
x = f.read().lower().split()
s = socket.socket()
host = input(str('Enter hostname or host IP : '))
port = int(input('Enter the port number : '))
s.connect((host, port))
print('Connected to chat server')
while 1:
    incoming_message = s.recv(1024)
    incoming_message = incoming_message.decode()
    print('Server : ', incoming_message)
    print()
    message = input(str('>> '))
    m = message.split()
    for i in range(len(m)):
        if m[i] in x:
            m[i] = '*' * len(m[i])
        else:
            pass
    message = ' '.join(m)
    message = message.encode()
    s.send(message)
    print('Sent')
    print()
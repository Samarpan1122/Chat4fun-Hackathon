import socket
f = open('badwords.txt', 'r')
x = f.read().lower().split()
s = socket.socket()
host = socket.gethostname()
print('Server will start on host : ', host)
port = int(input('Enter the port number : '))
s.bind((host, port))
print()
print('Waiting for connection')
print()
s.listen(1)
conn, addr = s.accept()
print(addr, ' Has connected to the server')
print()
while 1:
    message = input(str('>> '))
    m = message.lower().split()
    for i in range(len(m)):
        if m[i] in x:
            m[i] = '*' * len(m[i])
        else:
            pass
    message = ' '.join(m)
    message = message.encode()
    conn.send(message)
    print('Sent')
    print()
    incoming_message = conn.recv(1024)
    incoming_message = incoming_message.decode()
    print('Client : ', incoming_message)
    print()
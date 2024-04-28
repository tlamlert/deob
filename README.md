# Yellow Poop Stain 💩🚽
This is Helen, Tiger, JZ, and Mandy's project.

## MapReduce Workflow API docs

### Crawler Workflow
- Proprocessing: get uncrawled URLs from `distribution.uncrawledURLs`
- Keys:
- Existing dataset structure:
- To-s dataset structure:
- Mapper:
- Reducer: 

### Indexing Workflow


### Query Workflow

## TODO's
1. Extend `distribution.js` to take in a list of IP addresses as an extra argument
    * nodeConfig.start must communicate with all nodes (specified by the input IP addresses), passing its own ip address (TODO: is it possible to get the ip address of the current EC2 instance???) maybe via comm.send
    * If we have time (lmao): implement routes.connect() to support adding new nodes to the already established distributed system.
    * 

2. The private key `jz-key.pem` is needed to SSH into the EC2 instance. We could create multiple users on the server to avoid passing on the private key. https://stackoverflow.com/a/55222064
3. Deploy the server on 0.0.0.0:port_num, meaning the server listens on all interfaces
    * Is it possible to get the exact interface we should be listening on instead of 0.0.0.0? Something about an private(internal) IP address. https://stackoverflow.com/questions/33953447/express-app-server-listen-all-interfaces-instead-of-localhost-only

How do we control what workflow to run and when?

## Useful Code Snippets
### Setup script for a new EC2 instance
```shell
sudo apt update
sudo apt install nodejs git vim
git clone https://github.com/tlamlert/m6.git
sudo apt install npm
```

### Testing locally
shell1 (worker): `node distribution.js --port 8081`
shell2 (coordinator): `node ./coordinator/server.js --workers 127.0.0.1 --workerPorts 8081`
shell3 (client): `curl -X PUT -d "" 127.0.0.1:8080/crawler/start`
query: `curl -X GET -d "" "127.0.0.1:8080/search?q=constitution“` 
<!-- note that you need to stick it through some url converter thing if you want to input multiple strings -->

### Testing locally (Multiple workers)
shell1 (worker): `node distribution.js --port 8081`
shell2 (coordinator): `node ./coordinator/server.js --workers 127.0.0.1,127.0.0.1,127.0.0.1 --workerPorts 8081,8082,8083`
shell3 (client): `curl -X PUT -d "" 127.0.0.1:8080/crawler/start`
**Note** If all workers share the same port, pass in the port number in `--workerPorts` as one single value ex.
shell2 (coordinator): `node ./coordinator/server.js --workers <ip_addr_1>,<ip_addr_2>,<ip_addr_3> --workerPorts 8080`

### Manually Sending a Request to a Node (manual `comm.send`)
1. Start the node server and expose it to the public internet by running `node distribution.js --ip "0.0.0.0"`
2. Send a request to the node server (from a remote machine in the same network) by running the following command:
    ```shell
    curl -X PUT http://<public-ip-address>:<port>/status/get -H "Content-Type: application/json" -d '{"type":"array","value":{"0":"{\"type\":\"string\",\"value\":\"sid\"}"}}'
    ```

```shell
# Start a node server
node distribution.js --ip '127.0.0.1' --neighbors <ip_address_1>,<ip_address_2>,...

# Neighbors must be comma separated because shell script arguments are split by white spaces
# https://stackoverflow.com/questions/45589583/how-to-get-ip-adress-from-aws-ec2-command
const yargs = require('yargs/yargs');
yargs('node distribution.js --neighbors 0.0.0.0,1.1.1.1').parse();
```
```shell
# https://stackoverflow.com/questions/38679346/get-public-ip-address-on-current-ec2-instance
# IP addresses under this account?
aws ec2 describe-instances --query 'Reservations[*].Instances[*].PublicIpAddress' --output text | 
    paste -sd, # joins all lines into a single line

# The private IP address is available via:
$ curl http://169.254.169.254/latest/meta-data/local-ipv4

# The private IP address is available via:
$ curl http://169.254.169.254/latest/meta-data/public-ipv4
```

```js
function main() {
  console.log("Hello world!");
}
```

```python
def main():
    print("Hello world!")
```


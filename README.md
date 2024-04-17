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

### Manually Sending a Request to a Node (manual `comm.send`)
1. Start the node server and expose it to the public internet by running `node distribution.js --ip "0.0.0.0"`
2. Send a request to the node server (from a remote machine in the same network) by running the following command:
    ```shell
    curl -X PUT http://<public-ip-address>:<port>/status/get -H "Content-Type: application/json" -d '{}'
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


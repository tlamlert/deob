current_ip=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
ips=$(aws ec2 describe-instances --query 'Reservations[*].Instances[*].PublicIpAddress' --output text | 
    tr '\t' '\n' | awk -v ip="$current_ip" '$1 != ip' | paste -sd,)

# Count the number of IPs in the list
num_ips=$(echo "$ips" | tr ',' '\n' | wc -l)

# Generate the workerPorts list
workerPorts=$(printf '%s,' $(yes 8080 | head -n $num_ips) | sed 's/,$//')

tmux new-session -d -s c "node /home/ubuntu/m6/coordinator/server.js  --port 8080 --ip 0.0.0.0 --workers $ips --workerPorts $workerPorts"

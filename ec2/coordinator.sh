current_ip=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
ips=$(aws ec2 describe-instances --query 'Reservations[*].Instances[*].PublicIpAddress' --output text | 
    tr '\t' '\n' | awk -v ip="$current_ip" '$1 != ip' | paste -sd,)
node /home/ubuntu/m6/coordinator/server.js --workers $ips --port 8080 --ip 0.0.0.0
# tmux new-session -d -s worker "node /home/ubuntu/m6/coordinator/server.js --workers $ips --port 8080"
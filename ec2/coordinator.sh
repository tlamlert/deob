output=$(aws ec2 describe-instances --query 'Reservations[*].Instances[*].PublicIpAddress' --output text | 
    paste -sd,)
node server.js --workers $output --port 8080
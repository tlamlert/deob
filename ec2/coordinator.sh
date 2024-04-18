output=$(aws ec2 describe-instances --query 'Reservations[*].Instances[*].PublicIpAddress' --output text | 
    paste -sd,)
node ./coordinator/server.js --workers $output --port 8080
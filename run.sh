#!/bin/bash
redis-cli flushall
m=1
n=3
for i in $(seq $m $n) # m,, m+1, m+2, ... , n
do
    (time ts-node --transpile-only src/SDB/main.ts $i) > output_logs/output_$i.log 2>&1 &
done
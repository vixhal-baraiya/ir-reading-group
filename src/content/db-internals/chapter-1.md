---
title: "Chapter 1 — Database Internals"
chapter: 1
---

Chapter 1 ka main point ye hai: **database bahar se simple lagta hai, but andar bilkul kahtarnaak game chal raha hai ki data ko kaise store karna, kaise jaldi dhoondhna, aur crash ke baad kaise bachana.** 

---

## 1. Database actually karta kya hai?

Simple language mein database ka kaam hai:

```
data save karo
data jaldi dhoondo
update/delete safe rakho
crash ke baad data recover karo
multiple users ko ek saath handle karo
```

App ke level pe hum bolte hain:

```sql
SELECT * FROM users WHERE id = 10;
```

But database ke andar ye query direct disk pe nahi jaati. Bahut layers cross karti hai.

---

# 2. DBMS architecture

Roughly flow aisa hai:

```
Client
  ↓
Transport
  ↓
Query Processor
  ↓
Query Optimizer
  ↓
Execution Engine
  ↓
Storage Engine
```

---

## Transport layer

Ye database ka entry gate hai.

PostgreSQL/MySQL/MongoDB ko request bhejta hai. Sabse pehle transport layer us request ko receive karti hai.

Iska kaam:

```
network connection handle karna
client se query lena
authentication/protocol handle karna
cluster ke dusre nodes se baat karna
```

Single-node DB mein ye mostly client-server communication hai.

Distributed DB mein ye aur important ho jaata hai, because query ek node pe aayi ho sakti hai but data dusre node pe ho.

---

## Query processor

Query processor raw query ko samajhne layak structure mein convert karta hai.

Example:

```sql
SELECT name FROM users WHERE id = 10;
```

Database isko string ki tarah nahi chalata. Pehle parse karta hai.

Internally kuch aisa tree ban sakta hai:

```
Project name
  Filter id = 10
    Table users
```

Ye layer check karti hai:

```
users table exist karti hai?
name column hai?
id ka type valid hai?
user ko permission hai?
```

Yaha tak database bas samajh raha hota hai ki user chahta kya hai.

---

## Query optimizer

Ye database ka crazy smart part hai.

Same query ko chalane ke multiple tareeke ho sakte hain.

Example:

```sql
SELECT * FROM orders WHERE user_id = 42;
```

Database ke paas options ho sakte hain:

```
full table scan karo
user_id index use karo
partition/shard metadata use karo
cache/stats ka use karo
```

Optimizer decide karta hai ki kaunsa plan cheapest hoga.

Ye stats dekhta hai:

```
table mein kitne rows hain
index available hai ya nahi
index selective hai ya nahi
data local node pe hai ya remote node pe
network cost kitna hai
```

Optimizer ka output hota hai **execution plan**.

Execution plan matlab database ka exact plan:

```
pehle ye index read karo
phir ye rows fetch karo
phir filter lagao
phir result return karo
```

---

## Execution engine

Execution engine actual plan chalata hai.

Agar plan bolta hai index use karo, to execution engine storage engine ko bolega:

```
mujhe user_id = 42 wale records chahiye
```

Distributed DB mein execution engine remote nodes se bhi kaam karwa sakta hai.

Example:

```
Node A pe query aayi
data Node B aur Node C pe hai
Node A dono ko subquery bhejta hai
B aur C partial result bhejte hain
A merge karke client ko result deta hai
```

---

## Storage engine

Ab aata hai main part.

Storage engine database ka woh component hai jo actual data ko disk/memory mein store karta hai.

Storage engine usually SQL ke baare mein deeply nahi sochta. Uske liye data mostly key-value/bytes jaisa hota hai.

Example:

```
key   = user:10
value = serialized user object
```

Higher database layer ko pata hai ki value ke andar name, age, email hai. But storage engine ke liye ye mostly bytes hain.

Isi wajah se storage engines pluggable ho sakte hain.

Example:

```
MySQL → InnoDB, MyISAM, RocksDB/MyRocks
MongoDB → WiredTiger, In-Memory, old MMAPv1
```

Database ka upper layer schema/query/transactions deta hai.

Storage engine ka kaam hai:

```
record ko store karna
record ko dhoondhna
record update/delete karna
disk pe layout maintain karna
crash recovery mein help karna
```

---

# 3. Storage engine ke andar kya hota hai?

storage engine ke andar kuch components hai:

```
Transaction manager
Lock manager
Access methods
Buffer manager
Recovery manager
```

---

## Transaction manager

Ye transaction ko logically safe rakhta hai.

Example:

```sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

Agar first update ho gaya aur second se pehle crash aa gaya, to database inconsistent ho sakta hai.

Transaction manager ensure karta hai ki transaction ya to properly complete ho, ya rollback ho.

---

## Lock manager

Ye concurrent users ko handle karta hai.

Suppose do users same record update kar rahe hain:

```
Client A: user 10 update kar raha hai
Client B: user 10 update kar raha hai
```

Agar lock nahi hua to dono ek dusre ka update overwrite kar sakte hain.

Lock manager bolta hai:

```
A ke paas write lock hai
B wait karega
```

Iska kaam hai data corruption aur race condition se bachana.

---

## Access methods

Ye actual data structures hain jinke through data access hota hai.

Examples:

```
B-Tree
LSM Tree
Hash index
Heap file
```

Agar hum database internals seriously padh rahe ho, to ye section sabse important hai.

B-Tree ka goal: reads aur range scans fast.

LSM Tree ka goal: writes fast.

Hash index ka goal: exact key lookup fast.

Heap file ka goal: simple storage, usually append-friendly.

---

## Buffer manager

Disk slow hoti hai. RAM fast hoti hai.

Database har record ke liye disk hit nahi karna chahta. Isliye woh disk ke pages RAM mein cache karta hai.

Database usually single row nahi read karta. Woh page read karta hai.

Example:

```
page size = 16 KB
ek page ke andar multiple records ho sakte hain
```

Agar ek record chahiye, database uska page memory mein laata hai. Phir same page ke dusre records bhi fast mil jaate hain.

Yehi reason hai ki page layout storage engines mein itna important hota hai.

---

## Recovery manager

Ye crash ke baad database ko recover karta hai.

Suppose write chal rahi thi aur server crash ho gaya.

Recovery manager decide karega:

```
kaunsi transaction committed thi
kaunsi incomplete thi
kisko redo karna hai
kisko undo karna hai
```

Ye logs use karta hai, jise later chapters mein WAL/write-ahead log ke naam se detail mein padhoge.

---

# 4. Memory-based vs disk-based DBMS

Ab chapter ek important classification deta hai.

Database primarily kahan data rakhta hai?

```
RAM mein?
Disk/SSD mein?
```

---

## Disk-based database

Disk-based database mein main data disk/SSD pe hota hai. RAM mostly cache ke liye use hoti hai.

Examples conceptually:

```
PostgreSQL
MySQL/InnoDB
SQLite
RocksDB-style systems
```

Disk-based DB ke design mein sabse bada pain hai:

```
random disk access expensive hota hai
```

Isliye disk-based structures aise design hote hain ki kam se kam disk reads/writes lage.

B-Tree isi wajah se wide and short hota hai. Ek node/page mein bahut saare keys store karta hai, taaki ek disk read mein zyada decision mil sake.

---

## Memory-based database

Memory-based database mein main data RAM mein hota hai. Disk logs/snapshots/recovery ke liye use hoti hai.

Examples conceptually:

```
Redis with persistence
in-memory engines
VoltDB-style systems
```

RAM mein pointer follow karna cheap hai.

Disk pe pointer follow karna dangerous hai, because har pointer jump random I/O ban sakta hai.

Isliye memory database aur disk database ka internal structure kaafi different ho sakta hai.

---

## Important point: in-memory DB just "disk DB with huge cache" nahi hota

Ye chapter ka solid point hai.

Agar disk-based DB ke paas huge cache ho, tab bhi uska data layout disk-oriented hota hai:

```
pages
serialized records
disk format
fragmentation handling
offsets
```

Memory DB memory-native structures use kar sakta hai:

```
pointers
hash tables
skip lists
memory trees
native objects
```

Isliye same data RAM mein hone ka matlab same performance nahi hai.

---

## Memory DB durability kaise handle karta hai?

RAM volatile hai. Power gaya, process crash hua, machine down hui, data gaya.

Durable in-memory database disk pe kuch na kuch maintain karta hai:

```
write-ahead log
snapshot
checkpoint
backup copy
```

Flow roughly:

```
write request aayi
pehle log file mein append karo
memory mein update karo
background mein snapshot update karo
crash ke baad snapshot load karo aur remaining log replay karo
```

Checkpointing ka matlab:

```
logs ko snapshot mein apply karo
phir purane logs discard kar sakte ho
```

Isse recovery time control mein rehta hai.

---

# 5. Row-oriented vs column-oriented database

Ab chapter physical layout pe aata hai.

Table logically aisi dikhti hai:

```
ID | Name  | Age | Phone
10 | John  | 30  | +1...
20 | Sam   | 25  | +1...
30 | Keith | 28  | +1...
```

But disk pe isko store karne ke do major styles hain.

---

## Row-oriented layout

Row store full row ko saath rakhta hai.

Physical layout:

```
[10, John, 30, +1...]
[20, Sam, 25, +1...]
[30, Keith, 28, +1...]
```

Ye best hai jab tum mostly full record read karte ho.

Example:

```sql
SELECT * FROM users WHERE id = 10;
```

Ek user ka complete data chahiye. Row store perfect hai.

Isliye row stores OLTP workloads ke liye strong hote hain:

```
user login
payment update
order status update
single user fetch
small transactions
```

Examples:

```
PostgreSQL
MySQL
SQLite
traditional relational DBs
```

---

## Row store ki weakness

Suppose query hai:

```sql
SELECT AVG(age) FROM users;
```

Tumhe sirf `age` column chahiye.

But row store ko full rows read karni pad sakti hain:

```
id, name, email, phone, age, address...
```

Most data useless read ho gaya.

Analytics mein ye wasteful ho sakta hai.

---

## Column-oriented layout

Column store same column ke values saath rakhta hai.

Physical layout:

```
ID:    10, 20, 30
Name:  John, Sam, Keith
Age:   30, 25, 28
Phone: +1..., +1..., +1...
```

Ye best hai jab tum bahut rows scan karte ho but few columns chahiye.

Example:

```sql
SELECT AVG(price) FROM stock_prices;
```

Database mostly price column read karega. Baaki columns ignore kar sakta hai.

Column stores OLAP/analytics ke liye strong hote hain:

```
dashboards
aggregations
large scans
reporting
data warehouse
```

Examples:

```
ClickHouse
Parquet
ORC
Vertica-style systems
Apache Kudu
```

---

## Column stores fast kyun hote hain analytics mein?

Do reasons important hain.

First, unnecessary columns read nahi karne padte.

Second, same type ke values saath hote hain, so compression achhi hoti hai.

Example:

```
status: active, active, active, inactive, inactive
country: IN, IN, IN, US, US
age: 20, 21, 21, 22, 22
```

Ye compress karna easy hai.

CPU bhi vectorized operations chala sakta hai:

```
ek hi operation multiple numbers pe saath mein
```

Matlab analytical scan mein column store hardware ko better use karta hai.

---

# 6. Wide-column stores alag cheez hain

Yaha confusion hota hai.

Column-oriented DB aur wide-column store same nahi hain.

Column-oriented DB:

```
analytics ke liye columns ko separately store karta hai
```

Wide-column store:

```
row key ke andar column families aur dynamic columns store karta hai
```

Examples:

```
Bigtable
HBase
Cassandra-like model
```

Book Bigtable ka Webtable example deti hai.

Structure roughly:

```
row key -> column family -> column qualifier -> timestamp -> value
```

Example:

```
com.cnn.www
  contents:
    t3: html = "<html>..."
    t5: html = "<html>..."
  anchor:
    t9: cnnsi.com = "CNN"
```

Yaha row key hai reversed URL:

```
com.cnn.www
```

Isse same domain ke pages sorted order mein close aa jaate hain.

Wide-column store ka mental model ye rakho:

```
sorted multidimensional map
```

Ye ClickHouse/Parquet type columnar layout nahi hai.

---

# 7. Data files and index files

Ab database files ki baat.

Database normal text files mein data nahi rakhta. Woh apna custom binary/file format banata hai.

Reason:

```
storage efficient hona chahiye
lookup fast hona chahiye
updates manageable hone chahiye
```

Normal filesystem sirf file dhoondh sakta hai.

But database ko dhoondhna hota hai:

```
id = 10 wala record
email = x wala user
1000 se 2000 ke beech orders
```

Isliye database ke paas usually:

```
data files
index files
```

hote hain.

---

## Data file

Data file actual records store karti hai.

Example:

```
id=10, name=John, age=30
```

---

## Index file

Index file record tak pahunchne ka shortcut hoti hai.

Example:

```
id=10 -> page 50, offset 120
```

Without index:

```
poori table scan karo
```

With index:

```
index lookup karo
direct record location pe jao
```

Index ka basic idea:

```
search key -> record location
```

---

# 8. Data files ke types

Chapter three types mention karta hai:

```
heap-organized
hash-organized
index-organized
```

---

## Heap file

Heap file mein records kisi sorted order mein nahi hote. Mostly insert order mein store ho jaate hain.

Example:

```
page 1: user 80, user 12
page 2: user 7, user 99
page 3: user 10
```

Insert fast hota hai, because bas jagah mili aur record daal diya.

But lookup ke liye index chahiye.

Without index, full scan.

---

## Hash-organized file

Yaha key ka hash decide karta hai record kis bucket mein jayega.

```
hash(user_id) % bucket_count = bucket id
```

Exact lookup fast:

```sql
WHERE id = 10
```

But range scan weak:

```sql
WHERE id BETWEEN 10 AND 100
```

Because hashing order destroy kar deta hai.

---

## Index-organized table

Yaha actual data index ke andar hi stored hota hai.

Example:

```
id=10 -> full user record
id=20 -> full user record
id=30 -> full user record
```

Data primary key order mein hota hai.

Benefit:

```
index lookup ke baad separate data file hit nahi karni padti
```

Range scan bhi achha:

```sql
WHERE id BETWEEN 10 AND 30
```

Because records sorted order mein physically close hain.

---

# 9. Primary index, secondary index, clustered, nonclustered

Ye terms confuse karte hain, but simple hai.

## Primary index

Primary key pe index.

```
id -> record
```

Usually unique hota hai.

---

## Secondary index

Non-primary field pe index.

Example:

```
email -> record
city -> records
status -> records
```

Secondary index duplicate keys hold kar sakta hai.

Example:

```
city = Bhopal -> many users
```

---

## Clustered index

Clustered ka matlab physical data order index key ke order ko follow karta hai.

Example:

```
data physically sorted by id
```

Range scan fast ho jaata hai.

---

## Nonclustered index

Index sorted hai, but actual data file us order mein nahi hai.

Example:

```
index on email sorted alphabetically
but rows disk pe random/insertion order mein
```

Lookup mein index se location milti hai, phir scattered data reads ho sakte hain.

---

# 10. Primary index as indirection

Ye part kaafi important hai.

Secondary index directly record location store kar sakta hai:

```
email -> physical row location
```

Ya secondary index primary key store kar sakta hai:

```
email -> id
id -> record
```

Second approach mein ek extra hop hai.

Question: extra hop kyun?

Because record ki physical location change ho sakti hai.

Example:

```
compaction hua
page split hua
vacuum hua
record move hua
```

Agar secondary indexes physical location store kar rahe hain, to har move pe sab secondary indexes update karne padenge.

Agar secondary indexes primary key store karte hain:

```
email -> id
```

to record move hone par mostly primary index update hoga. Secondary indexes stable rahenge.

Trade-off:

```
read mein extra lookup
write/maintenance mein less pain
```

Database internals mein aise hi trade-offs har jagah milenge.

---

# 11. Tombstones

Delete usually direct delete nahi hota.

Many storage engines deletion marker likhte hain, jise tombstone bolte hain.

Example:

```
PUT user:10 = John
PUT user:10 = Johnny
DELETE user:10
```

Storage mein ho sakta hai:

```
user:10 -> John      t1
user:10 -> Johnny    t2
user:10 -> TOMBSTONE t3
```

Tombstone ka matlab:

```
is key ke old values deleted maana jaayega
```

Immediate delete expensive hota hai, especially immutable files mein.

Baad mein compaction/garbage collection old values hata deta hai.

Ye LSM-tree style engines mein very important concept hai.

---

# 12. Buffering, immutability, ordering

Chapter end mein teen big ideas deta hai.

---

## Buffering

Small writes ko memory mein collect karo, phir ek large sequential write karo.

Instead of:

```
100 byte write
200 byte write
150 byte write
```

Better:

```
4 MB sequential write
```

This improves write throughput.

But problem:

```
agar buffer flush hone se pehle crash ho gaya?
```

Answer:

```
write-ahead log
```

---

## Immutability

Immutable storage ka matlab old file ko modify nahi karna.

Update aaya to new version likho.

```
old value stays
new value written elsewhere
```

Benefit:

```
sequential writes easy
concurrent readers safe
crash handling simpler
```

Cost:

```
old data accumulate hota hai
compaction chahiye
space extra lagta hai
read multiple places check kar sakti hai
```

LSM Trees mein ye pattern bahut common hai.

---

## Ordering

Ordering ka matlab data key order mein store karna.

Example:

```
1, 2, 3, 4, 5
```

Benefit:

```
range scans fast
binary search possible
merge easy
```

Example:

```sql
WHERE id BETWEEN 100 AND 200
```

Ordered data mein database 100 pe jump karke sequential scan kar sakta hai.

But insert/update expensive ho sakta hai, because order maintain karna padta hai.

Again same trade-off:

```
reads easy
writes harder
```

---

# Final understanding

Chapter 1 ka real lesson ye hai:

Database design mein koi perfect structure nahi hota. Har design kisi workload ke liye optimize hota hai aur kisi aur cheez mein cost deta hai.

```
Row store → OLTP good, analytics weak
Column store → analytics good, full row fetch costly
Hash file → exact lookup good, range scan weak
Heap file → insert easy, lookup index dependent
Index-organized table → primary lookup/range scan good, maintenance complex
Memory DB → fast, durability tricky
Disk DB → cheap durable storage, I/O-aware design needed
Immutable storage → writes easy, compaction cost
Ordered storage → reads/range scans good, writes harder
```

Database ko naam se judge mat karo. Workload dekho.

```
reads kaise hain?
writes kitni hain?
range scans chahiye?
point lookups chahiye?
data memory mein fit hota hai?
durability kitni important hai?
updates frequent hain?
analytics hai ya user-facing transactions?
```

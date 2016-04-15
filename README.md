### EC2 Spot Market Analyzer

__NOTE: Does not work for longer time spans due to aggressive rate limiting of AWS__

Queries the AWS spot market API for local analysis via csv or to derive stats from (how often would i be priced out with my set price). This is a __work in progress__ and doesn't work well.

#### Install

```
git clone ...
npm install
```

#### Run

```
node index.js
```

#### Usage

```
Usage: index.js <command> [options]

Commands:
  csv    Output csv results to use in spreadsheets
  stats  Output statistics

Options:
  --regions         comma-separated list of AWS regions                [default:
  "us-east-1,us-west-2,us-west-1,eu-west-1,eu-central-1,ap-northeast-1,ap-southe
                                                ast-1,ap-southeast-2,sa-east-1"]
  --instance-types  comma-separated list of AWS EC2 instances to look for
                                             [default: "r3.8xlarge,m4.10xlarge"]
  --max-price       on stats, calculate percentage of time max-price could get a
                    spot instance
  --hours           hours back to look at, min 1, max 90 * 24 = 2160
                                                           [number] [default: 1]
```

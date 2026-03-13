#!/bin/bash

################################################################################
# Heady Deployment Health Check Script
################################################################################
#
# USAGE:
#   ./heady-deploy-check.sh                    # Run full diagnostics
#   ./heady-deploy-check.sh --json            # Output machine-readable JSON
#   ./heady-deploy-check.sh --help            # Show this help message
#
# DESCRIPTION:
#   Comprehensive health-check and diagnostic tool for the Heady ecosystem.
#   Verifies HTTP endpoints, SSL certificates, DNS resolution, API authentication,
#   database connectivity, and Cloud Manager endpoints.
#
# REQUIREMENTS:
#   - curl
#   - openssl
#   - dig or nslookup
#
################################################################################

set -o pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Flags
JSON_OUTPUT=false
VERBOSE=false

# Results storage
declare -a HTTP_RESULTS
declare -a SSL_RESULTS
declare -a DNS_RESULTS
declare -a API_RESULTS
declare -a DB_RESULTS

# Endpoints to check
ENDPOINTS=(
    "headysystems.com"
    "headyme.com"
    "heady-ai.com"
    "headyconnection.com"
    "headybuddy.com"
    "headymcp.com"
)

CLOUD_MANAGER_ENDPOINTS=(
    "heady-manager-headyme.headysystems.com"
    "heady-manager-headysystems.headysystems.com"
    "heady-manager-headyconnection.headysystems.com"
)

################################################################################
# Helper Functions
################################################################################

print_help() {
    grep "^#" "$0" | head -40
}

log_pass() {
    if [ "$JSON_OUTPUT" = true ]; then
        echo "PASS"
    else
        echo -e "${GREEN}✓ PASS${NC}"
    fi
}

log_warn() {
    if [ "$JSON_OUTPUT" = true ]; then
        echo "WARN"
    else
        echo -e "${YELLOW}⚠ WARN${NC}"
    fi
}

log_fail() {
    if [ "$JSON_OUTPUT" = true ]; then
        echo "FAIL"
    else
        echo -e "${RED}✗ FAIL${NC}"
    fi
}

log_info() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${BLUE}ℹ${NC} $1"
    fi
}

log_section() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo ""
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}$1${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    fi
}

################################################################################
# HTTP Checks
################################################################################

check_http_endpoint() {
    local endpoint=$1
    local protocol="${2:-https}"

    if [ "$JSON_OUTPUT" = false ]; then
        printf "  %-40s " "$endpoint"
    fi

    local response=$(curl -s -w "\n%{http_code}" -m 10 \
        --connect-timeout 5 \
        "$protocol://$endpoint" 2>/dev/null | tail -1)

    if [ -z "$response" ]; then
        log_fail
        HTTP_RESULTS+=("$endpoint:FAIL:Connection timeout")
    elif [ "$response" = "200" ] || [ "$response" = "301" ] || [ "$response" = "302" ] || [ "$response" = "404" ]; then
        log_pass
        HTTP_RESULTS+=("$endpoint:PASS:HTTP $response")
    elif [ "$response" = "000" ]; then
        log_fail
        HTTP_RESULTS+=("$endpoint:FAIL:Connection refused")
    else
        log_warn
        HTTP_RESULTS+=("$endpoint:WARN:HTTP $response")
    fi
}

check_http_endpoints() {
    log_section "HTTP Endpoint Status"

    log_info "Checking main endpoints..."
    for endpoint in "${ENDPOINTS[@]}"; do
        check_http_endpoint "$endpoint" "https"
    done

    log_info "Checking Cloud Manager endpoints..."
    for endpoint in "${CLOUD_MANAGER_ENDPOINTS[@]}"; do
        check_http_endpoint "$endpoint" "https"
    done
}

################################################################################
# SSL Certificate Checks
################################################################################

check_ssl_certificate() {
    local endpoint=$1

    if [ "$JSON_OUTPUT" = false ]; then
        printf "  %-40s " "$endpoint"
    fi

    local cert_info=$(echo | openssl s_client -servername "$endpoint" -connect "$endpoint:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)

    if [ -z "$cert_info" ]; then
        log_fail
        SSL_RESULTS+=("$endpoint:FAIL:Unable to retrieve certificate")
        return
    fi

    local expiry=$(echo "$cert_info" | grep "notAfter=" | cut -d= -f2)
    local expiry_epoch=$(date -d "$expiry" +%s 2>/dev/null || echo 0)
    local now_epoch=$(date +%s)
    local days_left=$(( ($expiry_epoch - $now_epoch) / 86400 ))

    if [ $days_left -lt 0 ]; then
        log_fail
        SSL_RESULTS+=("$endpoint:FAIL:Certificate expired")
    elif [ $days_left -lt 14 ]; then
        log_warn
        SSL_RESULTS+=("$endpoint:WARN:Expires in $days_left days")
    elif [ $days_left -lt 60 ]; then
        log_warn
        SSL_RESULTS+=("$endpoint:WARN:Expires in $days_left days")
    else
        log_pass
        SSL_RESULTS+=("$endpoint:PASS:Expires in $days_left days")
    fi
}

check_ssl_certificates() {
    log_section "SSL Certificate Validity"

    log_info "Checking certificate expiration dates..."
    for endpoint in "${ENDPOINTS[@]}" "${CLOUD_MANAGER_ENDPOINTS[@]}"; do
        check_ssl_certificate "$endpoint"
    done
}

################################################################################
# DNS Resolution Checks
################################################################################

check_dns_resolution() {
    local endpoint=$1

    if [ "$JSON_OUTPUT" = false ]; then
        printf "  %-40s " "$endpoint"
    fi

    local ip=$(dig +short "$endpoint" 2>/dev/null | head -1)

    if [ -z "$ip" ]; then
        # Fallback to nslookup if dig is not available
        ip=$(nslookup "$endpoint" 2>/dev/null | grep "Address:" | tail -1 | awk '{print $NF}')
    fi

    if [ -z "$ip" ]; then
        log_fail
        DNS_RESULTS+=("$endpoint:FAIL:Unable to resolve")
    else
        log_pass
        DNS_RESULTS+=("$endpoint:PASS:$ip")
    fi
}

check_dns_resolutions() {
    log_section "DNS Resolution"

    log_info "Checking DNS records for all domains..."
    for endpoint in "${ENDPOINTS[@]}" "${CLOUD_MANAGER_ENDPOINTS[@]}"; do
        check_dns_resolution "$endpoint"
    done
}

################################################################################
# API Authentication Test
################################################################################

test_api_authentication() {
    log_section "API Authentication Flow"

    log_info "Testing API authentication (simulated)..."

    local api_endpoint="https://api.headysystems.com/v1/inference"

    if [ "$JSON_OUTPUT" = false ]; then
        printf "  %-40s " "API Key Header Format"
    fi

    # Check if API endpoint is reachable
    local response=$(curl -s -w "\n%{http_code}" -m 10 \
        -H "Authorization: Bearer test_key_12345" \
        -H "Content-Type: application/json" \
        "$api_endpoint" 2>/dev/null | tail -1)

    if [ "$response" = "401" ] || [ "$response" = "403" ]; then
        log_pass
        API_RESULTS+=("API Key Auth:PASS:Endpoint reachable (rejected invalid key)")
    elif [ "$response" = "400" ]; then
        log_pass
        API_RESULTS+=("API Key Auth:PASS:Endpoint reachable")
    elif [ "$response" = "000" ]; then
        log_fail
        API_RESULTS+=("API Key Auth:FAIL:Endpoint unreachable")
    else
        log_warn
        API_RESULTS+=("API Key Auth:WARN:HTTP $response")
    fi

    if [ "$JSON_OUTPUT" = false ]; then
        printf "  %-40s " "OAuth 2.0 Endpoint"
    fi

    local oauth_endpoint="https://auth.headysystems.com/oauth/authorize"
    local oauth_response=$(curl -s -w "\n%{http_code}" -m 10 \
        -G "$oauth_endpoint" \
        --data-urlencode "client_id=test" \
        --data-urlencode "response_type=code" \
        2>/dev/null | tail -1)

    if [ -n "$oauth_response" ] && [ "$oauth_response" != "000" ]; then
        log_pass
        API_RESULTS+=("OAuth 2.0:PASS:Endpoint reachable")
    else
        log_fail
        API_RESULTS+=("OAuth 2.0:FAIL:Endpoint unreachable")
    fi

    if [ "$JSON_OUTPUT" = false ]; then
        printf "  %-40s " "Rate Limiting Headers"
    fi

    local rate_limit_check=$(curl -s -i -m 10 \
        -H "Authorization: Bearer test" \
        "$api_endpoint" 2>/dev/null | grep -i "X-RateLimit" | head -1)

    if [ -n "$rate_limit_check" ]; then
        log_pass
        API_RESULTS+=("Rate Limiting:PASS:Headers present")
    else
        log_warn
        API_RESULTS+=("Rate Limiting:WARN:Headers not detected")
    fi
}

################################################################################
# Database Connectivity Check
################################################################################

check_database_connectivity() {
    log_section "Database Connectivity"

    log_info "Testing database endpoints (pattern-based)..."

    if [ "$JSON_OUTPUT" = false ]; then
        printf "  %-40s " "Primary DB Connection"
    fi

    # Simulated check - in production would use actual connection strings
    local db_host="db.headysystems.com"
    local db_port="5432"

    local db_check=$(timeout 5 bash -c "echo > /dev/tcp/$db_host/$db_port" 2>/dev/null && echo "1" || echo "0")

    if [ "$db_check" = "1" ]; then
        log_pass
        DB_RESULTS+=("Primary DB:PASS:Connected to $db_host:$db_port")
    else
        log_fail
        DB_RESULTS+=("Primary DB:FAIL:Unable to connect to $db_host:$db_port")
    fi

    if [ "$JSON_OUTPUT" = false ]; then
        printf "  %-40s " "Replica DB Connection"
    fi

    local replica_host="replica-db.headysystems.com"
    local replica_check=$(timeout 5 bash -c "echo > /dev/tcp/$replica_host/$db_port" 2>/dev/null && echo "1" || echo "0")

    if [ "$replica_check" = "1" ]; then
        log_pass
        DB_RESULTS+=("Replica DB:PASS:Connected to $replica_host:$db_port")
    else
        log_warn
        DB_RESULTS+=("Replica DB:WARN:Unable to connect to $replica_host:$db_port")
    fi

    if [ "$JSON_OUTPUT" = false ]; then
        printf "  %-40s " "Cache Layer (Redis)"
    fi

    local cache_host="cache.headysystems.com"
    local cache_port="6379"
    local cache_check=$(timeout 5 bash -c "echo > /dev/tcp/$cache_host/$cache_port" 2>/dev/null && echo "1" || echo "0")

    if [ "$cache_check" = "1" ]; then
        log_pass
        DB_RESULTS+=("Cache Layer:PASS:Connected to $cache_host:$cache_port")
    else
        log_fail
        DB_RESULTS+=("Cache Layer:FAIL:Unable to connect to $cache_host:$cache_port")
    fi
}

################################################################################
# Summary Report
################################################################################

generate_text_report() {
    log_section "Summary Report"

    local http_pass=0
    local http_fail=0
    local ssl_pass=0
    local ssl_fail=0
    local dns_pass=0
    local dns_fail=0
    local api_pass=0
    local api_fail=0
    local db_pass=0
    local db_fail=0

    for result in "${HTTP_RESULTS[@]}"; do
        IFS=':' read -r endpoint status detail <<< "$result"
        if [ "$status" = "PASS" ]; then
            ((http_pass++))
        else
            ((http_fail++))
        fi
    done

    for result in "${SSL_RESULTS[@]}"; do
        IFS=':' read -r endpoint status detail <<< "$result"
        if [ "$status" = "PASS" ]; then
            ((ssl_pass++))
        else
            ((ssl_fail++))
        fi
    done

    for result in "${DNS_RESULTS[@]}"; do
        IFS=':' read -r endpoint status detail <<< "$result"
        if [ "$status" = "PASS" ]; then
            ((dns_pass++))
        else
            ((dns_fail++))
        fi
    done

    for result in "${API_RESULTS[@]}"; do
        IFS=':' read -r check status detail <<< "$result"
        if [ "$status" = "PASS" ]; then
            ((api_pass++))
        else
            ((api_fail++))
        fi
    done

    for result in "${DB_RESULTS[@]}"; do
        IFS=':' read -r check status detail <<< "$result"
        if [ "$status" = "PASS" ]; then
            ((db_pass++))
        else
            ((db_fail++))
        fi
    done

    echo ""
    echo "HTTP Endpoints:        $http_pass passed, $http_fail failed"
    echo "SSL Certificates:      $ssl_pass passed, $ssl_fail failed"
    echo "DNS Resolution:        $dns_pass passed, $dns_fail failed"
    echo "API Authentication:    $api_pass passed, $api_fail failed"
    echo "Database Connectivity: $db_pass passed, $db_fail failed"
    echo ""

    local total_pass=$((http_pass + ssl_pass + dns_pass + api_pass + db_pass))
    local total_fail=$((http_fail + ssl_fail + dns_fail + api_fail + db_fail))
    local total=$((total_pass + total_fail))
    local pass_pct=$((total_pass * 100 / total))

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "Overall Health: $total_pass/$total passed ($pass_pct%)"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    if [ $total_fail -eq 0 ]; then
        echo -e "${GREEN}✓ All systems operational${NC}"
    elif [ $total_fail -le 3 ]; then
        echo -e "${YELLOW}⚠ Minor issues detected - review warnings${NC}"
    else
        echo -e "${RED}✗ Critical issues detected - immediate action required${NC}"
    fi
}

generate_json_report() {
    echo "{"
    echo '  "timestamp": "'$(date -Iseconds)'\",'
    echo '  "version": "1.0",'
    echo '  "results": {'

    echo '    "http_endpoints": ['
    local first=true
    for result in "${HTTP_RESULTS[@]}"; do
        IFS=':' read -r endpoint status detail <<< "$result"
        if [ "$first" = false ]; then echo ","; fi
        echo -n "      {\"endpoint\": \"$endpoint\", \"status\": \"$status\", \"detail\": \"$detail\"}"
        first=false
    done
    echo ""
    echo '    ],'

    echo '    "ssl_certificates": ['
    first=true
    for result in "${SSL_RESULTS[@]}"; do
        IFS=':' read -r endpoint status detail <<< "$result"
        if [ "$first" = false ]; then echo ","; fi
        echo -n "      {\"endpoint\": \"$endpoint\", \"status\": \"$status\", \"detail\": \"$detail\"}"
        first=false
    done
    echo ""
    echo '    ],'

    echo '    "dns_resolution": ['
    first=true
    for result in "${DNS_RESULTS[@]}"; do
        IFS=':' read -r endpoint status detail <<< "$result"
        if [ "$first" = false ]; then echo ","; fi
        echo -n "      {\"endpoint\": \"$endpoint\", \"status\": \"$status\", \"detail\": \"$detail\"}"
        first=false
    done
    echo ""
    echo '    ],'

    echo '    "api_authentication": ['
    first=true
    for result in "${API_RESULTS[@]}"; do
        IFS=':' read -r check status detail <<< "$result"
        if [ "$first" = false ]; then echo ","; fi
        echo -n "      {\"check\": \"$check\", \"status\": \"$status\", \"detail\": \"$detail\"}"
        first=false
    done
    echo ""
    echo '    ],'

    echo '    "database_connectivity": ['
    first=true
    for result in "${DB_RESULTS[@]}"; do
        IFS=':' read -r check status detail <<< "$result"
        if [ "$first" = false ]; then echo ","; fi
        echo -n "      {\"check\": \"$check\", \"status\": \"$status\", \"detail\": \"$detail\"}"
        first=false
    done
    echo ""
    echo '    ]'
    echo '  }'
    echo '}'
}

################################################################################
# Main Execution
################################################################################

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --json)
                JSON_OUTPUT=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                print_help
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                print_help
                exit 1
                ;;
        esac
    done

    # Run checks
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
        echo -e "${BLUE}║     Heady Deployment Health Check                  ║${NC}"
        echo -e "${BLUE}║     $(date)              ║${NC}"
        echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
    fi

    check_http_endpoints
    check_ssl_certificates
    check_dns_resolutions
    test_api_authentication
    check_database_connectivity

    if [ "$JSON_OUTPUT" = true ]; then
        generate_json_report
    else
        generate_text_report
    fi
}

main "$@"

import { encodeGraph } from "../encodeTree";

test.skip('encodeGraph regression', () => {
    const porcelain = {
        participant: [
            {
                id: '1d7b7ecc-0591-46bd-94aa-32560086ddbc',
                '$key': '1d7b7ecc-0591-46bd-94aa-32560086ddbc'
            },
            {
                id: '3692f0c4-3c51-4aba-9b13-abfdcbd349d7',
                '$key': '3692f0c4-3c51-4aba-9b13-abfdcbd349d7'
            },
            {
                '$key':
                {
                    tenantId: 'c126cf52-2c80-45e3-8419-eb8fbff041f0',
                    '$cursor': [1675174298184, '3692f0c4-3c51-4aba-9b13-abfdcbd349d7',]
                },
                $ref: ['participant', '3692f0c4-3c51-4aba-9b13-abfdcbd349d7',]
            },
            {
                '$key':
                {
                    tenantId: 'c126cf52-2c80-45e3-8419-eb8fbff041f0',
                    '$cursor': [1675174298216, '1d7b7ecc-0591-46bd-94aa-32560086ddbc',]
                },
                $ref: ['participant', '1d7b7ecc-0591-46bd-94aa-32560086ddbc',]
            },
        ]
    };

    porcelain.participant.$put = [{
        tenantId: 'c126cf52-2c80-45e3-8419-eb8fbff041f0',
        '$since': [1675174298184, '3692f0c4-3c51-4aba-9b13-abfdcbd349d7',]
    }];
    const result = encodeGraph(porcelain);
    expect(result).toEqual(
        []
    );
})